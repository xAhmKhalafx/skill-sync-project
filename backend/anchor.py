"""
anchor.py — minimal on-chain anchoring helper for Skill-Sync

- Hashes the uploaded file (sha256)
- Builds payload: b"CLAIM|<id>|<amount_cents>|<sha256(file)>"
- Sends a 0 ETH EIP-1559 tx with the payload in `data` to TO_ADDRESS
- Returns the tx hash (hex string)

Env (put in backend/.env and keep out of git):
WEB3_PROVIDER_URL = https://sepolia.infura.io/v3/<project-id>
PRIVATE_KEY       = 0x<private_key>
TO_ADDRESS        = 0x<to_or_contract>
CHAIN_ID          = 11155111
MAX_FEE_GWEI      = 30
MAX_PRIO_GWEI     = 1
ANCHOR_ENABLED    = true
"""

from __future__ import annotations

import os
import hashlib
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, Optional

from web3 import Web3
from web3.types import TxParams
from eth_account import Account
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Configuration / env
# -----------------------------------------------------------------------------

load_dotenv()  # loads backend/.env if present

WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL")
PRIVATE_KEY       = os.getenv("PRIVATE_KEY")
TO_ADDRESS        = os.getenv("TO_ADDRESS") or os.getenv("ANCHOR_TO")  # accept either
CHAIN_ID          = int(os.getenv("CHAIN_ID", "11155111"))             # 11155111=Sepolia
MAX_FEE_GWEI      = int(os.getenv("MAX_FEE_GWEI", "30"))
MAX_PRIO_GWEI     = int(os.getenv("MAX_PRIO_GWEI", "1"))
ANCHOR_ENABLED    = os.getenv("ANCHOR_ENABLED", "true").lower() == "true"

# Normalize key
if PRIVATE_KEY and not PRIVATE_KEY.startswith("0x"):
    PRIVATE_KEY = "0x" + PRIVATE_KEY

# Explorer bases (used by UI for links)
_EXPLORERS = {
    1: "https://etherscan.io",
    5: "https://goerli.etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    137: "https://polygonscan.com",
    80001: "https://mumbai.polygonscan.com",
}
explorer_base: str = _EXPLORERS.get(CHAIN_ID, "")

# Lazy singletons
w3: Optional[Web3] = None
account = None
TO_CHECKSUM: Optional[str] = None


def _ensure_web3():
    """Initialize Web3/account/checksum address and validate config."""
    global w3, account, TO_CHECKSUM

    missing = [name for name, val in [
        ("WEB3_PROVIDER_URL", WEB3_PROVIDER_URL),
        ("PRIVATE_KEY",       PRIVATE_KEY),
        ("TO_ADDRESS",        TO_ADDRESS),
    ] if not val]
    if missing:
        raise RuntimeError(f"Blockchain not configured: set {', '.join(missing)}.")

    if w3 is None:
        w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))
        if not w3.is_connected():
            raise RuntimeError("Web3 provider not reachable (check WEB3_PROVIDER_URL).")

    if account is None:
        account = Account.from_key(PRIVATE_KEY)

    if TO_CHECKSUM is None:
        TO_CHECKSUM = w3.to_checksum_address(TO_ADDRESS)


# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------

def _sha256_file(path: str) -> str:
    """Return hex sha256(path) reading in chunks."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _amount_to_cents(amount_any) -> int:
    """Convert number-like to integer cents safely."""
    return int(
        Decimal(str(amount_any or 0))
        .scaleb(2)  # *100
        .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )


def _build_payload(file_path: str, claim_id: str, amount_cents: int) -> Tuple[bytes, str]:
    """
    Build payload: CLAIM|<id>|<amount_cents>|<sha256(file)>
    Returns (bytes_payload, sha256_hex_string)
    """
    file_hash_hex = _sha256_file(file_path)
    raw = f"CLAIM|{claim_id}|{amount_cents}|{file_hash_hex}".encode("utf-8")
    return raw, file_hash_hex

# Back-compat exports expected by app.py:
_payload = _build_payload  # app.py imports this name


def _gwei(n: int) -> int:
    """Integer Gwei to Wei."""
    _ensure_web3()
    return w3.to_wei(n, "gwei")  # type: ignore[union-attr]


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------

def is_configured() -> bool:
    try:
        _ensure_web3()
        return True
    except Exception:
        return False


def get_address() -> Optional[str]:
    try:
        _ensure_web3()
        return account.address  # type: ignore[union-attr]
    except Exception:
        return None


def anchor_claim(file_path: str, claim_id: str, amount_cents: int | str | float) -> Optional[str]:
    """
    Anchor a claim on-chain.
    Returns tx hash string (0x...) on success, or None if ANCHOR_ENABLED is false.
    Raises RuntimeError for configuration/provider errors.
    """
    if not ANCHOR_ENABLED:
        return None

    _ensure_web3()

    amt_cents = amount_cents if isinstance(amount_cents, int) else _amount_to_cents(amount_cents)
    data_bytes, _ = _build_payload(file_path, claim_id, amt_cents)
    data_hex = "0x" + data_bytes.hex()

    try:
        latest = w3.eth.get_block("latest")
        base = latest.get("baseFeePerGas", 0) or 0
    except Exception:
        base = 0

    # try node suggestion for tip; fall back to env
    try:
        suggested_prio = w3.eth.max_priority_fee
    except Exception:
        suggested_prio = 0

    prio = max(suggested_prio or 0, _gwei(MAX_PRIO_GWEI))
    max_fee = max(base * 2 + prio, _gwei(MAX_FEE_GWEI))

    tx: TxParams = {
        "chainId": CHAIN_ID,
        "type": 2,
        "from": account.address,            # type: ignore[union-attr]
        "to": TO_CHECKSUM,                  # type: ignore[arg-type]
        "value": 0,
        "data": data_hex,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": prio,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"), # type: ignore[union-attr]
    }

    # Gas estimate (fallback to a safe ceiling)
    try:
        gas_est = w3.eth.estimate_gas({"from": tx["from"], "to": tx["to"], "value": 0, "data": data_bytes})
        tx["gas"] = int(gas_est) + 5000
    except Exception:
        tx["gas"] = 120_000

    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)  # type: ignore[arg-type,union-attr]
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return tx_hash.hex()


def fetch_tx_input(tx_hash: str) -> str:
    """
    Return the `input` data (hex string) for a given transaction hash
    using the connected provider (no Etherscan API required).
    """
    _ensure_web3()
    tx = w3.eth.get_transaction(tx_hash)
    return tx["input"]  # hex string like "0x..."


__all__ = [
    "anchor_claim",
    "is_configured",
    "get_address",
    "fetch_tx_input",
    "explorer_base",
    "_payload",            # legacy export expected by app.py
]
