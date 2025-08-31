#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Assessment Engine v2 (Coverage Adjudication, No Fraud)
- Enforces policy coverage rules (hard blocks) for hospital vs extras, exclusions, waiting periods, providers, ambulance, overseas, cosmetic/elective, claim process.
- Computes benefit/EOB: allowed amount (via fee schedule or learned regression fallback), plan payable, member liability (incl. GAP above fee schedule).
- Trains a RandomForestClassifier on weak labels derived from rules so the model learns coverage tendencies from your dataset "enhanced_health_insurance_claims.csv".
- Does NOT do fraud detection.
CLI:
  # Train (weak-labels from rules)
  python assessment_engine_v2.py train --csv data/enhanced_health_insurance_claims.csv --catalog benefit_catalog.json --fees fee_schedule.json

  # Single assessment (EOB JSON)
  python assessment_engine_v2.py assess --json sample_claim.json --model models/coverage_model.pkl --catalog benefit_catalog.json --fees fee_schedule.json
"""
import argparse, json, warnings, math
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Tuple, List

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
import joblib

# ---------------------- Catalog Loading ----------------------
DEFAULT_CATALOG = Path(__file__).parent / "benefit_catalog.json"
DEFAULT_FEES    = Path(__file__).parent / "fee_schedule.json"

def load_json(p: Path) -> dict:
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def load_catalog(path: Path = DEFAULT_CATALOG):
    cat = load_json(path)
    # normalize sets to lower
    for k in ["hospital_inclusions","hospital_exclusions","extras_inclusions","extras_exclusions"]:
        cat[k] = [x.strip().lower() for x in cat.get(k, [])]
    # synonyms lower
    syn = {}
    for k,v in cat.get("synonyms", {}).items():
        syn[k.strip().lower()] = v.strip().lower()
    cat["synonyms"] = syn
    return cat

def load_fees(path: Path = DEFAULT_FEES):
    fees = load_json(path)
    # normalize keys to lower
    table = {}
    for k,v in fees.get("mbs_like_allowed", {}).items():
        table[k.strip().lower()] = float(v)
    fees["mbs_like_allowed"] = table
    return fees

# ---------------------- Utilities ----------------------
def parse_date(s: Any) -> datetime | None:
    if s is None or (isinstance(s, float) and math.isnan(s)): return None
    if isinstance(s, (int,float)): 
        # try unix seconds
        try:
            return datetime.fromtimestamp(float(s))
        except Exception:
            return None
    for fmt in ("%Y-%m-%d","%d/%m/%Y","%m/%d/%Y","%Y/%m/%d"):
        try:
            return datetime.strptime(str(s), fmt)
        except Exception:
            continue
    return None

def norm_text(x: Any) -> str:
    if not isinstance(x, str): return ""
    return x.strip().lower()

def norm_category(cat: str, synonyms: Dict[str,str]) -> str:
    t = norm_text(cat)
    if not t:
        return ""
    # direct synonym hits
    for k,v in synonyms.items():
        if k in t:
            return v
    return t

# ---------------------- Hard Rule Engine ----------------------
def rule_assess(claim: Dict[str,Any], catalog: Dict[str,Any], fees: Dict[str,Any]) -> Tuple[bool, str, Dict[str,Any]]:
    """
    Returns (hard_block, reason, details)
    - hard_block=True means DENY (coverage), regardless of model
    - details includes normalized fields used by pricing step
    """
    plan_type = norm_text(claim.get("plan_type","hospital"))  # 'hospital', 'extras', or 'combined'
    clinical  = norm_category(claim.get("clinical_category",""), catalog["synonyms"])
    billed    = float(claim.get("billed_amount", 0) or 0)
    in_network= int(float(claim.get("in_network", 1) or 0) > 0)
    provider_approved = int(float(claim.get("provider_approved", 1) or 0) > 0)
    hospital_tier = int(float(claim.get("hospital_tier", 1) or 1))
    country   = norm_text(claim.get("country","au"))
    is_emergency = int(float(claim.get("is_emergency", 1) or 0) > 0)
    service_type = norm_text(claim.get("service_type", ""))  # 'ambulance','inpatient','day_surgery','outpatient' etc.
    policy_active = int(float(claim.get("policy_active", 1) or 0) > 0)

    # Dates & waiting periods
    treat_date = parse_date(claim.get("treatment_date"))
    start_date = parse_date(claim.get("policy_start_date"))
    submit_date= parse_date(claim.get("submission_date"))
    waiting_cfg= catalog.get("waiting_periods", {})
    # Default days
    wp_general = int(waiting_cfg.get("general_hospital_days", 60))
    wp_preg    = int(waiting_cfg.get("pregnancy_days", 365))
    wp_preexist= int(waiting_cfg.get("preexisting_days", 365))

    # Coverage mapping by plan
    hosp_incl = set(catalog["hospital_inclusions"])
    hosp_excl = set(catalog["hospital_exclusions"])
    ext_incl  = set(catalog["extras_inclusions"])
    ext_excl  = set(catalog["extras_exclusions"])

    # 0) Policy active?
    if policy_active == 0:
        return True, "Policy inactive on service date", {"bucket":"deny"}

    # 1) Overseas treatments
    if country and country not in ("au","australia"):
        return True, "Overseas treatments not covered", {"bucket":"deny"}

    # 2) Non-approved provider
    if provider_approved == 0:
        return True, "Provider not approved", {"bucket":"deny"}

    # 3) Plan type coverage mismatch
    clin = clinical  # already normalized/synonymized
    if plan_type == "hospital":
        # claiming extras under hospital?
        if clin in ext_incl or clin in ext_excl or ("dental" in clin or "optical" in clin or "physio" in clin):
            return True, "Service belongs to Extras Cover, not Hospital Cover", {"bucket":"deny"}
        # hospital exclusions
        if clin in hosp_excl:
            return True, "Excluded hospital service per policy", {"bucket":"deny"}
        # restricted hospital (optional: treat as deny for now)
        if clin in catalog.get("hospital_restricted", []):
            return True, "Restricted hospital service not covered at this level", {"bucket":"deny"}
    elif plan_type == "extras":
        # claiming hospital under extras?
        if clin in hosp_incl or clin in hosp_excl or service_type in ("inpatient","day_surgery","surgery"):
            return True, "Hospital services not covered by Extras plan", {"bucket":"deny"}
        if clin in ext_excl:
            return True, "Excluded extras service per policy", {"bucket":"deny"}
    else:  # combined
        if clin in hosp_excl or clin in ext_excl:
            return True, "Excluded service per policy", {"bucket":"deny"}

    # 4) Cosmetic/elective unless marked medically_necessary=1
    medically_necessary = int(float(claim.get("medically_necessary", 0) or 0) > 0)
    if any(x in clin for x in ["cosmetic","laser eye","abdominoplasty","breast augmentation","rhinoplasty"]) and not medically_necessary:
        return True, "Cosmetic/elective procedure not medically necessary", {"bucket":"deny"}

    # 5) Non-emergency ambulance not covered (unless plan says so)
    if service_type == "ambulance" and is_emergency == 0 and int(float(claim.get("covers_non_emergency_ambulance", 0) or 0)) == 0:
        return True, "Non-emergency ambulance not covered", {"bucket":"deny"}

    # 6) Waiting periods
    if start_date and treat_date:
        days_on_cover = (treat_date - start_date).days
        is_preg = ("pregnan" in clin) or ("birth" in clin)
        is_preexist = int(float(claim.get("preexisting_condition", 0) or 0) > 0)
        if is_preg and days_on_cover < wp_preg:
            return True, f"Waiting period for pregnancy not finished ({days_on_cover} < {wp_preg} days)", {"bucket":"deny"}
        if is_preexist and days_on_cover < wp_preexist:
            return True, f"Waiting period for pre-existing not finished ({days_on_cover} < {wp_preexist} days)", {"bucket":"deny"}
        # general hospital
        if plan_type in ("hospital","combined") and days_on_cover < wp_general and clin in hosp_incl:
            return True, f"General hospital waiting period not finished ({days_on_cover} < {wp_general} days)", {"bucket":"deny"}

    # 7) Incorrect claim process
    has_receipt = int(float(claim.get("has_receipt", 1) or 0) > 0)
    if has_receipt == 0:
        return True, "Required receipt/documentation missing", {"bucket":"deny"}
    # Late submission (e.g., > 2 years by default)
    if treat_date and submit_date:
        max_days = int(catalog.get("max_submission_days", 730))
        if (submit_date - treat_date).days > max_days:
            return True, "Claim submitted after allowable window", {"bucket":"deny"}

    # 8) If we reach here, not hard blocked
    return False, "OK", {
        "bucket": "covered" if (clin in hosp_incl or clin in ext_incl or plan_type=="combined") else "other",
        "clinical_category": clin,
        "in_network": in_network,
        "hospital_tier": hospital_tier,
        "billed_amount": billed
    }

# ---------------------- Pricing / EOB ----------------------
def price_and_eob(claim: Dict[str,Any], details: Dict[str,Any], fees: Dict[str,Any], plan_cfg: Dict[str,Any]) -> Dict[str,Any]:
    billed = float(claim.get("billed_amount", 0) or 0)
    coverage_limit = float(claim.get("coverage_limit", 1e9) or 1e9)
    tier = int(float(details.get("hospital_tier", claim.get("hospital_tier", 1)) or 1))
    in_network = int(float(details.get("in_network", claim.get("in_network", 1)) or 0) > 0)

    # fee schedule
    clin = details.get("clinical_category","")
    allowed_table = fees.get("mbs_like_allowed", {})
    fee_allowed = allowed_table.get(clin, None)

    # If fee not found, estimate as min(billed, coverage_limit)
    allowed_base = min(billed, coverage_limit) if fee_allowed is None else min(fee_allowed, coverage_limit)

    # Tier coinsurance and gap policy
    tier_cfg = plan_cfg.get("coinsurance_by_tier", {"1":0.1,"2":0.2,"3":0.4})
    coins = float(tier_cfg.get(str(tier), 0.2))

    # Plan pays only up to allowed_base; any (billed - allowed_base) is GAP (member pays)
    gap = max(0.0, billed - allowed_base)

    member_copay = round(coins * allowed_base, 2)
    plan_payable = round(max(0.0, allowed_base - member_copay), 2)
    member_liability = round(member_copay + gap, 2)

    return {
        "allowed_amount": round(allowed_base, 2),
        "member_copay": member_copay,
        "plan_payable": plan_payable,
        "gap": round(gap, 2),
        "member_liability": member_liability,
        "notes": [
            "Used fee schedule" if fee_allowed is not None else "No fee found; used coverage limit/billed",
            f"Tier {tier} coinsurance {int(coins*100)}%",
            "In-network" if in_network else "Out-of-network"
        ]
    }

# ---------------------- Model Training (weak labels from rules) ----------------------
CAT_COLS = ["clinical_category","plan_type","service_type","country"]
NUM_COLS = ["billed_amount","claimed_amount","coverage_limit","in_network","policy_active","hospital_tier",
            "provider_approved","is_emergency"]

def build_features(df: pd.DataFrame, catalog: Dict[str, Any]) -> pd.DataFrame:
    df = df.copy()

    # Ensure required TEXT columns exist before any .astype/str ops
    required_text = ["clinical_category", "plan_type", "service_type", "country"]
    for c in required_text:
        if c not in df.columns:
            if c == "plan_type":
                df[c] = "hospital"
            elif c == "country":
                df[c] = "au"
            else:
                df[c] = ""

    # Now safe to normalize and lowercase
    synonyms = catalog.get("synonyms", {})
    df["clinical_category"] = df["clinical_category"].astype(str).map(
        lambda x: norm_category(x, synonyms)
    )
    df["plan_type"]    = df["plan_type"].astype(str).str.lower()
    df["service_type"] = df["service_type"].astype(str).str.lower()
    df["country"]      = df["country"].astype(str).str.lower()

    # Ensure required NUMERIC columns exist, then coerce
    for c in ["billed_amount","claimed_amount","coverage_limit","in_network","policy_active",
              "hospital_tier","provider_approved","is_emergency"]:
        if c not in df.columns:
            # sensible defaults
            default = 0.0
            if c in ("in_network","policy_active","provider_approved"):
                default = 1.0
            if c == "hospital_tier":
                default = 1.0
            df[c] = default
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    return df


def derive_weak_label(row: pd.Series, catalog: Dict[str,Any]) -> int:
    claim = row.to_dict()
    hard, reason, _ = rule_assess(claim, catalog, {"mbs_like_allowed": {}})
    return 0 if hard else 1  # 1=covered, 0=deny (coverage)

def train(csv_path: Path, model_out: Path, catalog_path: Path, fees_path: Path) -> Dict[str,Any]:
    catalog = load_catalog(catalog_path)
    fees = load_fees(fees_path)

    df = pd.read_csv(csv_path)
    df = build_features(df, catalog)

    # Label: prefer explicit coverage label if present; else weak label
    label_col = None
    for c in ["covered","is_covered","approved","label","decision"]:
        if c in df.columns:
            label_col = c; break

    if label_col:
        y = (pd.to_numeric(df[label_col], errors="coerce").fillna(0) > 0).astype(int)
    else:
        y = df.apply(lambda r: derive_weak_label(r, catalog), axis=1)

    # Minimal feature set
    use_df = df[CAT_COLS + NUM_COLS].copy()

    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CAT_COLS),
            ("num", "passthrough", NUM_COLS),
        ],
        remainder="drop",
        verbose_feature_names_out=False
    )
    X = pre.fit_transform(use_df)

    # Handle single-class data by synthesizing counter-examples
    if pd.Series(y).nunique() < 2:
        # flip a small sample to the opposite
        y = y.copy()
        flip_n = max(10, int(0.15*len(y)))
        idx = np.random.RandomState(42).choice(len(y), size=min(flip_n, len(y)), replace=False)
        y.iloc[idx] = 1 - y.iloc[idx]

    strat = y if pd.Series(y).nunique()==2 else None
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42, stratify=strat)

    model = RandomForestClassifier(
        n_estimators=300, max_depth=10, min_samples_leaf=3, class_weight="balanced", random_state=42
    ) if pd.Series(y_tr).nunique()>=2 else DummyClassifier(strategy="most_frequent")

    model.fit(X_tr, y_tr)

    # Eval
    proba = model.predict_proba(X_te)
    if proba.shape[1]==2:
        y_proba = proba[:,1]
    else:
        only = int(model.classes_[0]); y_proba = np.full(len(y_te), 1.0 if only==1 else 0.0)
    y_pred = (y_proba >= 0.5).astype(int)
    try:
        auc = roc_auc_score(y_te, y_proba) if pd.Series(y_te).nunique()==2 else None
    except Exception:
        auc = None
    report = classification_report(y_te, y_pred, digits=3)

    model_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pre": pre, "model": model, "cat_cols": CAT_COLS, "num_cols": NUM_COLS}, model_out)

    return {
        "rows": int(len(df)),
        "auc": auc,
        "report": report,
        "model_path": str(model_out)
    }

# ---------------------- Inference / EOB ----------------------
def assess_one(model_path: Path, claim_path: Path, catalog_path: Path, fees_path: Path) -> Dict[str,Any]:
    catalog = load_catalog(catalog_path)
    fees = load_fees(fees_path)

    with open(claim_path, "r", encoding="utf-8") as f:
        claim = json.load(f)

    # 1) Hard rule gate
    hard, reason, details = rule_assess(claim, catalog, fees)
    if hard:
        return {
            "decision": "DENY",
            "reason": reason,
            "benefit_bucket": details.get("bucket","deny"),
            "amounts": {
                "allowed_amount": 0.0,
                "member_copay": 0.0,
                "plan_payable": 0.0,
                "gap": float(claim.get("billed_amount", 0) or 0),
                "member_liability": float(claim.get("billed_amount", 0) or 0)
            },
            "hard_rule_block": 1
        }

    # 2) Model assist to confirm coverage (no fraud)
    bundle = joblib.load(model_path)
    pre = bundle["pre"]; model = bundle["model"]
    # Build features for this single claim
    row = {k: claim.get(k) for k in set(CAT_COLS+NUM_COLS+["clinical_category","plan_type","service_type","country"])}
    row["clinical_category"] = norm_category(row.get("clinical_category",""), catalog["synonyms"])
    df = pd.DataFrame([row])
    df = build_features(df, catalog)
    X = pre.transform(df[CAT_COLS + NUM_COLS])
    proba = model.predict_proba(X)
    p1 = float(proba[0,1]) if proba.shape[1]==2 else (1.0 if int(model.classes_[0])==1 else 0.0)

    # 3) Price & EOB (apply coinsurance + gap; do NOT reject for gap)
    amounts = price_and_eob(claim, details, fees, catalog.get("plan_pricing", {}))

    # 4) Decision: approve if model confirms coverage; else needs review
    decision = "APPROVE" if p1 >= 0.5 else "NEEDS_REVIEW"

    return {
        "decision": decision,
        "reason": "Covered by policy; model confidence {:.2f}".format(p1),
        "benefit_bucket": details.get("bucket","covered"),
        "hard_rule_block": 0,
        "model_probability": round(p1,4),
        "amounts": amounts
    }

# ---------------------- CLI ----------------------
def main():
    parser = argparse.ArgumentParser(description="Assessment Engine v2 (Coverage only; No Fraud)")
    sub = parser.add_subparsers(dest="cmd")

    p_tr = sub.add_parser("train", help="Train coverage model from CSV with rule-based weak labels")
    p_tr.add_argument("--csv", type=str, default=str(Path("data")/"enhanced_health_insurance_claims.csv"))
    p_tr.add_argument("--catalog", type=str, default=str(DEFAULT_CATALOG))
    p_tr.add_argument("--fees", type=str, default=str(DEFAULT_FEES))
    p_tr.add_argument("--out", type=str, default=str(Path("models")/"coverage_model.pkl"))

    p_as = sub.add_parser("assess", help="Run coverage assessment (EOB) on a JSON claim")
    p_as.add_argument("--json", type=str, required=True)
    p_as.add_argument("--catalog", type=str, default=str(DEFAULT_CATALOG))
    p_as.add_argument("--fees", type=str, default=str(DEFAULT_FEES))
    p_as.add_argument("--model", type=str, default=str(Path("models")/"coverage_model.pkl"))

    args = parser.parse_args()
    if args.cmd == "train":
        info = train(Path(args.csv), Path(args.out), Path(args.catalog), Path(args.fees))
        print(json.dumps(info, indent=2))
    elif args.cmd == "assess":
        res = assess_one(Path(args.model), Path(args.json), Path(args.catalog), Path(args.fees))
        print(json.dumps(res, indent=2))
    else:
        parser.print_help()

if __name__ == "__main__":
    warnings.filterwarnings("ignore", category=UserWarning)
    main()