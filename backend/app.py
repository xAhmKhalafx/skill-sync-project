# backend/app.py
import os
from pathlib import Path
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import logging
from anchor import anchor_claim


from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.exc import OperationalError

from anchor import anchor_claim, fetch_tx_input, explorer_base, _payload  # _payload used only server-side

BASE_DIR = Path(__file__).parent.resolve()
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ======================
# Flask app & DB config
# ======================
app = Flask(__name__)

# SQLite by default; allow DATABASE_URL override
db_url = os.getenv("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'claims.db'}"
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://skill-sync-ai-health-claim.netlify.app",
    ]}},
)

db = SQLAlchemy(app)

# ======================
# Database model
# ======================
class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id_str = db.Column(db.String(64), unique=True, index=True, nullable=False)  # public ID
    claimant_name = db.Column(db.String(200))
    procedure_code = db.Column(db.String(64))
    claim_amount = db.Column(db.Float)
    status = db.Column(db.String(32), default="manual_review")
    risk_score = db.Column(db.Float)
    decision_reason = db.Column(db.Text)
    eob_json = db.Column(db.Text)
    uploaded_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    blockchain_tx = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json as _json
        eob = None
        try:
            eob = _json.loads(self.eob_json) if self.eob_json else None
        except Exception:
            eob = None
        return {
            "claimId": self.claim_id_str,
            "claimant_name": self.claimant_name,
            "procedure_code": self.procedure_code,
            "claim_amount": self.claim_amount,
            "status": self.status,
            "risk_score": self.risk_score,
            "decision_reason": self.decision_reason,
            "eob": eob,
            "uploaded_filename": self.uploaded_filename,
            "created_at": self.created_at.isoformat() + "Z",
            "blockchain_tx": self.blockchain_tx,
        }

# ======================
# Helpers
# ======================
def simple_risk(amount: float, procedure_code: str) -> float:
    # Super-simple heuristic; replace with your ML as needed
    score = 0.1
    if amount is None:
        return 0.5
    if amount > 1000: score += 0.4
    if amount > 2500: score += 0.3
    if (procedure_code or "").upper().startswith("X"): score += 0.2
    return min(score, 0.99)

def decide_from_rules(amount: float, risk: float) -> tuple[str, str]:
    # Example policy: if risk < 0.4 and amount <= 1500 → auto approve; if risk > 0.75 → reject; else manual
    if risk < 0.4 and (amount or 0) <= 1500:
        return "approved", "Auto-approved: low risk and within policy threshold."
    if risk > 0.75:
        return "rejected", "Rejected: high risk score requires escalation."
    return "manual_review", "Requires human review."

def ensure_tables():
    try:
        with app.app_context():
            db.create_all()
    except OperationalError as e:
        print(f"[DB] OperationalError creating tables: {e}")

ensure_tables()

# ======================
# Routes
# ======================

# --- Add this near other routes in app.py ---
@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    USERS = {
        "user@demo.com": {"password": "demo123", "role": "policyholder", "name": "Demo User"},
        "insurer@demo.com": {"password": "insure123", "role": "insurer", "name": "Demo Insurer"},
    }
    user = USERS.get(email)
    if not user or user["password"] != password:
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({
        "access_token": "session",
        "role": user["role"],
        "email": email,
        "name": user["name"],
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/api/submit")
def submit_claim():
    """
    Expects multipart/form-data:
      - file: uploaded claim PDF/image (optional but recommended)
      - claimant_name, procedure_code, claim_amount
    """
    f = request.files.get("file")
    claimant_name = request.form.get("claimant_name") or "Unknown"
    procedure_code = request.form.get("procedure_code") or ""
    claim_amount = request.form.get("claim_amount")
    try:
        claim_amount = float(claim_amount) if claim_amount is not None else None
    except Exception:
        return jsonify({"message": "claim_amount must be a number"}), 400

    # Basic validation
    if f is None:
        return jsonify({"message": "file is required"}), 400
    if not f.filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff")):
        return jsonify({"message": "file must be a PDF or image"}), 400

    # Persist file
    pub_id = f"CLM-{int(datetime.utcnow().timestamp())}"
    safe_name = f"{pub_id}__{f.filename}"
    save_path = str(UPLOAD_DIR / safe_name)
    f.save(save_path)

    # Compute risk & decision
    risk = simple_risk(claim_amount, procedure_code)
    status, reason = decide_from_rules(claim_amount or 0.0, risk)

    c = Claim(
        claim_id_str=pub_id,
        claimant_name=claimant_name,
        procedure_code=procedure_code,
        claim_amount=claim_amount,
        status=status,
        risk_score=risk,
        decision_reason=reason,
        uploaded_filename=f.filename,
        file_path=save_path,
    )
    db.session.add(c)
    db.session.commit()

    # Try to anchor on-chain (never fail the API if chain fails)

    if not c.blockchain_tx:
        txh = None
        chain_error = None

        # Use cents (int) to avoid float rounding surprises
        amt_cents = int(
            Decimal(str(claim_amount or 0))
            .scaleb(2)                         # *100
            .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )

        try:
            # anchor_claim should return a tx hash string on success
            txh = anchor_claim(save_path, pub_id, amt_cents)
            if txh:
                c.blockchain_tx = txh
                db.session.commit()
            else:
                chain_error = "anchor_claim returned no tx hash"
        except Exception as e:
            chain_error = f"{type(e).__name__}: {e}"
            logging.exception("Blockchain anchor failed")

        resp = c.to_dict()
        resp["blockchain"] = {"tx": txh, "error": chain_error}
    else:
        # already anchored earlier
        resp = c.to_dict()
        resp["blockchain"] = {"tx": c.blockchain_tx, "error": None}

    return jsonify(resp), 201


@app.get("/api/claims")
def list_claims():
    claims = Claim.query.order_by(Claim.created_at.desc()).all()
    return jsonify([c.to_dict() for c in claims])

@app.get("/api/claims/<claim_id>")
def get_claim(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first()
    if not c:
        return jsonify({"message": "Not found"}), 404
    return jsonify(c.to_dict())

@app.post("/api/claims/<claim_id>/decision")
def decide_claim(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first()
    if not c:
        return jsonify({"message": "Not found"}), 404

    data = request.get_json(force=True, silent=True) or {}
    status = (data.get("status") or "").lower()
    reason = data.get("reason") or ""
    eob = data.get("eob")  # dict

    if status not in {"approved", "rejected", "manual_review"}:
        return jsonify({"message": "status must be approved|rejected|manual_review"}), 400

    import json as _json
    c.status = status
    c.decision_reason = reason
    try:
        c.eob_json = _json.dumps(eob) if eob is not None else None
    except Exception:
        c.eob_json = None

    db.session.commit()
    return jsonify(c.to_dict())

# ----- Chain helper + verification -----

@app.get("/api/chain")
def chain_info():
    return jsonify({"explorer": explorer_base()})

@app.get("/api/claims/<claim_id>/anchor/verify")
def verify_anchor(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first()
    if not c:
        return jsonify({"message": "Not found"}), 404
    if not c.blockchain_tx:
        return jsonify({"anchored": False, "reason": "No tx recorded"}), 404

    try:
        expected_payload, _ = _payload(c.file_path, c.claim_id_str, float(c.claim_amount or 0.0))
        onchain = fetch_tx_input(c.blockchain_tx)
        matches = (onchain == expected_payload)
        return jsonify({"anchored": True, "matches": bool(matches), "tx": c.blockchain_tx})
    except Exception as e:
        return jsonify({"anchored": False, "error": str(e)}), 500

@app.post("/api/claims/<claim_id>/anchor/retry")
def retry_anchor(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first()
    if not c:
        return jsonify({"message": "Not found"}), 404
    try:
        txh = anchor_claim(c.file_path, c.claim_id_str, float(c.claim_amount or 0.0))
        if txh:
            c.blockchain_tx = txh
            db.session.commit()
        return jsonify({"tx": txh})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# Entrypoint
# ======================
if __name__ == "__main__":
    # Ensure tables inside app context before starting the server
    with app.app_context():
        db.create_all()

    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
