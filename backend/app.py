import os
import re
import io
import json
import shutil
from pathlib import Path

import joblib
import numpy as np
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

# OCR deps (install from requirements.txt)
import pdfplumber
from PIL import Image
import pytesseract

# ---------- Paths ----------
root = Path(__file__).parent.resolve()
MODEL_PATH   = root / "models" / "rf_model.pkl"
DATASET_PATH = root / "data"   / "claims_dataset.csv"

MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)

# ---------- Tesseract on Windows (set path if not in PATH) ----------
if not shutil.which("tesseract"):
    default_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if Path(default_tesseract).exists():
        pytesseract.pytesseract.tesseract_cmd = default_tesseract

# ---------- Flask ----------
app = Flask(__name__)

# ---------- Helpers ----------
def _num(s, default=0.0):
    try:
        return float(s)
    except Exception:
        return default

def parse_text_block(text: str):
    """
    Extract key fields from a free-text claim/bill block.
    Works with plain text from JSON or OCR.
    """
    text = text or ""
    def gx(pat):
        m = re.search(pat, text, re.I)
        return m.group(1).strip() if m else ""

    patient = gx(r"Patient\s*Name[:\-\s]*(.+)")
    policy  = gx(r"Policy\s*ID[:\-\s]*(\w+)")
    diag    = gx(r"Diagnosis[:\-\s]*(.+)")
    hosp    = gx(r"Hospital[:\-\s]*(.+)")
    date    = gx(r"Date[:\-\s]*([\d\-/]+)")
    amt_str = gx(r"Amount[:\-\s]*\$?(\d+(?:\.\d+)?)")
    amount  = _num(amt_str, 0.0)

    return {
        "patient_name": patient,
        "policy_id": policy,
        "diagnosis": diag,
        "hospital": hosp,
        "date": date,
        "amount": amount
    }

def build_features_from_pair(claim, bill):
    """
    Features (order must match training):
      0 amount_claim
      1 amount_bill
      2 diag_len
      3 hosp_len
      4 match_amount
      5 match_patient
      6 match_hospital
      7 amount_diff
    """
    amount_claim = float(claim.get("amount") or 0.0)
    amount_bill  = float(bill.get("amount") or 0.0)
    diag_len     = len((claim.get("diagnosis") or "").strip())
    hosp_len     = len((claim.get("hospital") or "").strip())

    match_amount   = 1 if abs(amount_claim - amount_bill) < 1e-6 else 0
    match_patient  = 1 if (claim.get("patient_name","").casefold() == bill.get("patient_name","").casefold()) else 0
    match_hospital = 1 if (claim.get("hospital","").casefold() == bill.get("hospital","").casefold()) else 0
    amount_diff    = abs(amount_claim - amount_bill)

    feats = np.array([
        amount_claim, amount_bill, diag_len, hosp_len,
        match_amount, match_patient, match_hospital, amount_diff
    ], dtype=float).reshape(1, -1)

    feat_dict = {
        "amount_claim": amount_claim, "amount_bill": amount_bill,
        "diag_len": diag_len, "hosp_len": hosp_len,
        "match_amount": match_amount, "match_patient": match_patient,
        "match_hospital": match_hospital, "amount_diff": amount_diff
    }
    return feats, feat_dict

def load_model():
    if MODEL_PATH.exists():
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            return None
    return None

MODEL = load_model()

def predict_decision(claim_text: str, bill_text: str):
    """Core prediction used by both JSON and upload routes."""
    claim = parse_text_block(claim_text)
    bill  = parse_text_block(bill_text)
    X, feat = build_features_from_pair(claim, bill)

    used = "rule"
    if MODEL is None:
        # fallback rule if no model trained yet
        score = 0.8 if (feat["match_amount"] == 1 and feat["amount_claim"] <= 2500) else 0.3
        decision = "APPROVE" if score >= 0.5 else "REJECT"
    else:
        try:
            proba = float(MODEL.predict_proba(X)[0, 1])
            score = proba
            decision = "APPROVE" if score >= 0.5 else "REJECT"
            used = "rf"
        except Exception:
            score = 0.4
            decision = "REJECT"
            used = "rule-fallback"

    fraud_flags = []
    if feat["match_amount"] == 0:
        fraud_flags.append("Amount mismatch")
    if feat["match_patient"] == 0:
        fraud_flags.append("Patient name mismatch")
    if feat["match_hospital"] == 0:
        fraud_flags.append("Hospital mismatch")
    if feat["amount_diff"] >= 1000:
        fraud_flags.append("Large amount difference")

    return {
        "used": used,
        "parsed_claim": claim,
        "parsed_bill": bill,
        "features": feat,
        "decision": decision,
        "score": round(score, 4),
        "fraud_flags": fraud_flags
    }

# ---------- OCR helpers ----------
ALLOWED_EXT = {"pdf","png","jpg","jpeg"}

def extract_text_from_upload(fs):
    """Return plain text from an uploaded PDF/image using pdfplumber/pytesseract."""
    filename = secure_filename(fs.filename or "")
    ext = filename.rsplit(".",1)[-1].lower()
    buf = fs.read()
    if ext not in ALLOWED_EXT:
        return ""
    if ext == "pdf":
        parts = []
        with pdfplumber.open(io.BytesIO(buf)) as pdf:
            for page in pdf.pages:
                parts.append(page.extract_text() or "")
        return "\n".join(parts)
    else:
        im = Image.open(io.BytesIO(buf)).convert("RGB")
        return pytesseract.image_to_string(im)

# ---------- Routes ----------
@app.get("/health")
def health():
    return jsonify({"ok": True, "model_loaded": MODEL is not None})

@app.post("/train")
def train():
    r"""
    Train RandomForest on a CSV.
    Optional: ?csv=C:\path\to\your.csv
    CSV columns needed:
    amount_claim,amount_bill,diag_len,hosp_len,match_amount,match_patient,match_hospital,amount_diff,approved
    """
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, roc_auc_score

    csv_arg = request.args.get("csv")
    csv_path = Path(csv_arg).resolve() if csv_arg else DATASET_PATH
    if not csv_path.exists():
        return jsonify({"ok": False, "error": f"CSV not found: {csv_path}"}), 400

    df = pd.read_csv(csv_path)
    feat_cols = [
        "amount_claim","amount_bill","diag_len","hosp_len",
        "match_amount","match_patient","match_hospital","amount_diff"
    ]
    missing = [c for c in feat_cols + ["approved"] if c not in df.columns]
    if missing:
        return jsonify({"ok": False, "error": f"Dataset missing columns: {missing}"}), 400

    X = df[feat_cols].astype(float).values
    y = df["approved"].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200, max_depth=6, random_state=42, class_weight="balanced"
    )
    model.fit(X_train, y_train)

    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= 0.5).astype(int)

    try:
        auc = float(roc_auc_score(y_test, y_proba))
    except Exception:
        auc = None

    report = classification_report(y_test, y_pred, digits=3, output_dict=True)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    global MODEL
    MODEL = model

    return jsonify({
        "ok": True,
        "csv_used": str(csv_path),
        "saved_model": str(MODEL_PATH),
        "auc": auc,
        "report": report
    }), 200

@app.post("/validate")
def validate():
    """JSON input: { "claim_text": "...", "bill_text": "..." }"""
    body = request.get_json(force=True, silent=True) or {}
    claim_text = body.get("claim_text") or ""
    bill_text  = body.get("bill_text") or ""
    result = predict_decision(claim_text, bill_text)
    return jsonify(result), 200

@app.post("/validate-upload")
def validate_upload():
    """
    multipart/form-data with:
      - claim_file: PDF/PNG/JPG
      - bill_file:  PDF/PNG/JPG
    """
    if "claim_file" not in request.files or "bill_file" not in request.files:
        return jsonify({"ok": False, "error": "claim_file and bill_file required"}), 400

    claim_text = extract_text_from_upload(request.files["claim_file"])
    bill_text  = extract_text_from_upload(request.files["bill_file"])

    result = predict_decision(claim_text, bill_text)
    result.update({"ok": True, "claim_text_len": len(claim_text), "bill_text_len": len(bill_text)})
    return jsonify(result), 200

# ---------- Main ----------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
