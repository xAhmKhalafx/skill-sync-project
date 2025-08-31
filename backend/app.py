import os
import time
import json
import re
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# OCR / NLP
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

# Optional model (kept non-blocking)
import joblib
import pandas as pd

# ======================
# App & Config
# ======================
app = Flask(__name__)
bcrypt = Bcrypt(app)

# CORS: allow Netlify + local dev
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://skill-sync-ai-health-claim.netlify.app",
    ]}},
)

BASE_DIR = Path(__file__).resolve().parent

database_url = os.getenv("DATABASE_URL")
if database_url:
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    if os.name == "nt":  # Windows
        db_file = BASE_DIR / "claims.db"
    else:                # Linux/containers
        db_file = Path("/tmp/claims.db")
    # Make sure the directory exists
    db_file.parent.mkdir(parents=True, exist_ok=True)
    # Build a proper sqlite URI; use forward slashes
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_file.as_posix()}"

db = SQLAlchemy(app)

# ======================
# Optional ML model load (non-fatal)
# ======================
MODEL = None
try:
    model_path = BASE_DIR / "models" / "rf_model.pkl"
    if model_path.exists():
        MODEL = joblib.load(model_path)
        print("[ML] RandomForest model loaded.")
    else:
        print("[ML] No rf_model.pkl found. Skipping ML.")
except Exception as e:
    print(f"[ML] Failed to load model: {e}")

# ======================
# Assessment Engine bootstrap
# ======================
# Files expected at backend/assessment/data/...
from assessment.assessment_engine_v2 import (
    load_catalog, load_fees, rule_assess, price_and_eob
)

ASSESS_DIR = BASE_DIR / "assessment"
CATALOG_PATH = ASSESS_DIR / "data" / "benefit_catalog.json"
FEE_PATH     = ASSESS_DIR / "data" / "fee_schedule.json"

catalog = load_catalog(CATALOG_PATH)
fees    = load_fees(FEE_PATH)

PLAN_CFG = {}  # keep defaults; expand later for coinsurance tables etc.

# ======================
# DB Models
# ======================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="policyholder")


class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id_str = db.Column(db.String(100), unique=True, nullable=False)

    full_name = db.Column(db.String(100))
    email_address = db.Column(db.String(100))
    phone_number = db.Column(db.String(20))

    claim_amount = db.Column(db.Float)
    claim_description = db.Column(db.Text)
    file_path = db.Column(db.String(300))

    nlp_extracted_amount = db.Column(db.Float)

    ai_prediction = db.Column(db.String(50))  # final decision label
    status = db.Column(db.String(50), nullable=False, default="Processing")

    # Assessment outputs
    risk_score = db.Column(db.Float)
    decision_reason = db.Column(db.Text)      # joined reasons
    signals_json = db.Column(db.Text)         # JSON text
    eob_json = db.Column(db.Text)             # JSON text

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ClaimHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.Integer, db.ForeignKey("claim.id"))
    action = db.Column(db.String(50))         # 'approve'|'reject'|'manual_review'
    actor_email = db.Column(db.String(120))
    note = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ======================
# Helpers: OCR + NLP + Assessment
# ======================
def extract_text_from_file(file_path: str) -> str:
    text = ""
    try:
        if file_path.lower().endswith(".pdf"):
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text() or ""
        elif file_path.lower().endswith((".png", ".jpg", ".jpeg")):
            text = pytesseract.image_to_string(Image.open(file_path))
        print("--- Text extracted successfully ---")
    except Exception as e:
        print(f"[OCR] error: {e}")
    return text


def nlp_parse_text(text: str) -> dict:
    """
    Very simple amount extractor:
    matches 'Total Amount Due: $1234.56' or similar patterns.
    """
    if not text:
        return {"nlp_extracted_amount": None}

    patterns = [
        r"Total\s+Amount\s+Due:?\s*\$?(\d{1,6}(?:\.\d{2})?)",
        r"Amount\s+Due:?\s*\$?(\d{1,6}(?:\.\d{2})?)",
        r"Total:?\s*\$?(\d{1,6}(?:\.\d{2})?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            try:
                return {"nlp_extracted_amount": float(m.group(1))}
            except Exception:
                pass
    return {"nlp_extracted_amount": None}


def run_assessment_with_rules(description: str, amount: float, raw_text: str, nlp_amount: float | None):
    """
    Rules-first assessment with strong protection against amount mismatches.
    :param nlp_amount: numeric total extracted by OCR/NLP (may be None)
    """
    billed_amount = float(amount or 0.0)
    text = f"{raw_text or ''} {description or ''}".lower()

    # Basic context signals inferred from text
    service_type = "inpatient" if any(k in text for k in ["admission", "ward", "inpatient"]) else "outpatient"
    is_emergency = 1 if any(k in text for k in ["emergency", "ed ", "er "]) else 0

    # Record for coverage rules & pricing
    claim_rec = {
        "plan_type": "hospital",
        "clinical_category": description or "",
        "billed_amount": billed_amount,
        "coverage_limit": 1e9,
        "in_network": 1,
        "provider_approved": 1,
        "hospital_tier": 1,
        "country": "au",
        "is_emergency": is_emergency,
        "service_type": service_type,
        "policy_active": 1,
        "treatment_date": None,
        "policy_start_date": None,
        "submission_date": None,
    }

    hard_block, reason, details = rule_assess(claim_rec, catalog, fees)
    eob = price_and_eob(claim_rec, details, fees, PLAN_CFG)
    plan_payable = float(eob.get("plan_payable", 0) or 0)
    billed = billed_amount

    # ---------- Amount mismatch rules (NEW) ----------
    # Compute diff & ratio when we have an OCR/NLP total
    amount_diff = None
    mismatch_ratio = None
    amount_mismatch_reason = None

    if nlp_amount is not None and billed > 0:
        amount_diff = abs(billed - float(nlp_amount))
        mismatch_ratio = billed / max(float(nlp_amount), 0.01)

        # Very large mismatch -> Reject
        if amount_diff >= 1000 or mismatch_ratio >= 3.0:
            hard_block = True
            amount_mismatch_reason = (
                f"Claimed amount ${billed:,.2f} differs greatly from document total "
                f"${float(nlp_amount):,.2f} (Δ=${amount_diff:,.2f}, ×{mismatch_ratio:.2f})."
            )

        # Moderate mismatch -> Manual Review (raise risk)
        elif amount_diff >= 300 or mismatch_ratio >= 1.5:
            # not a hard block, but moderate risk
            amount_mismatch_reason = (
                f"Claimed amount ${billed:,.2f} does not match document total "
                f"${float(nlp_amount):,.2f} (Δ=${amount_diff:,.2f}, ×{mismatch_ratio:.2f})."
            )

    # ---------- Final decision ----------
    reasons = []
    if hard_block:
        decision = "Rejected"
        risk_score = 85
        reasons.append(reason or "Policy rules deny this claim.")
        if amount_mismatch_reason:
            reasons.insert(0, "Claimed ≠ Document total (severe).")
            reasons.append(amount_mismatch_reason)
    else:
        coverage_ratio = (plan_payable / billed) if billed > 0 else 0
        if amount_mismatch_reason:
            # Force Manual Review on moderate mismatch
            decision = "Manual Review"
            risk_score = 60
            reasons.append("Claimed ≠ Document total (moderate).")
            reasons.append(amount_mismatch_reason)
        else:
            if coverage_ratio <= 0.05:
                decision = "Manual Review"
                risk_score = 60
                reasons.append("Very low payable vs billed; requires human review.")
            elif coverage_ratio < 0.5:
                decision = "Manual Review"
                risk_score = 45
                reasons.append("Partial coverage; confirm itemization.")
            else:
                decision = "Approved"
                risk_score = 20
                reasons.append("Within coverage; payable amount calculated.")

    signals = {
        "service_type": service_type,
        "in_network": 1,
        "hospital_tier": 1,
        "country": "au",
        "is_emergency": is_emergency,
        "policy_bucket": details.get("bucket", "allow"),
        "allowed_amount": eob.get("allowed_amount"),
        "plan_payable": eob.get("plan_payable"),
        "member_liability": eob.get("member_liability"),
        # NEW visibility for UI / debugging
        "nlp_total": nlp_amount,
        "amount_diff": amount_diff,
        "mismatch_ratio": mismatch_ratio,
    }

    return {
        "decision": decision,
        "risk_score": risk_score,
        "reasons": reasons,
        "signals": signals,
        "eob": eob,
    }


# ======================
# API Routes
# ======================
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "time": time.time()})


@app.post("/api/register")
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    pwd = data.get("password", "")
    if not email or not pwd:
        return jsonify({"message": "email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "email already exists"}), 400

    hashed = bcrypt.generate_password_hash(pwd).decode("utf-8")
    role = data.get("role", "policyholder")
    u = User(email=email, password=hashed, role=role)
    db.session.add(u)
    db.session.commit()
    return jsonify({"message": "New user created!"}), 201


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    pwd = data.get("password", "")
    user = User.query.filter_by(email=email).first()
    if user and bcrypt.check_password_hash(user.password, pwd):
        # If you add JWT later, issue a real token here.
        return jsonify({"message": "Login successful!", "role": user.role, "access_token": "session"})
    return jsonify({"message": "Login failed! Check email and password."}), 401


@app.post("/api/submit")
def submit_claim():
    # Form fields
    full_name = request.form.get("fullName")
    email = request.form.get("email")
    phone = request.form.get("phone")
    description = request.form.get("description")
    amount = request.form.get("amount", type=float)
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No document file part"}), 400

    # Save upload (local disk)
    upload_folder = BASE_DIR / "uploads"
    upload_folder.mkdir(parents=True, exist_ok=True)
    filename = f"{int(time.time())}_{file.filename}"
    file_path = str(upload_folder / filename)
    file.save(file_path)

    # OCR + NLP
    raw_text = extract_text_from_file(file_path)
    nlp_data = nlp_parse_text(raw_text)

    # Assessment (rules)
    assessment = run_assessment_with_rules(
    description=description,
    amount=amount,
    raw_text=raw_text,
    nlp_amount=nlp_data.get("nlp_extracted_amount"),
)

    # (Optional) ML prediction — keep non-blocking (purely illustrative)
    if MODEL:
        try:
            df = pd.DataFrame({"age": [35], "bmi": [25.0], "children": [1], "smoker": [0], "region": [2]})
            pred = MODEL.predict(df)[0]
            # You could blend ML with rules; for now we ignore or log it
            print(f"[ML] prediction={pred}")
        except Exception as e:
            print(f"[ML] predict error: {e}")

    # Persist
    new_claim = Claim(
        claim_id_str=f"C-{int(time.time())}",
        full_name=full_name,
        email_address=email,
        phone_number=phone,
        claim_amount=amount,
        claim_description=description,
        file_path=file_path,
        nlp_extracted_amount=nlp_data.get("nlp_extracted_amount"),
        ai_prediction=assessment["decision"],
        status=assessment["decision"],
        risk_score=assessment["risk_score"],
        decision_reason="; ".join(assessment["reasons"]),
        signals_json=json.dumps(assessment["signals"]),
        eob_json=json.dumps(assessment["eob"]),
    )
    db.session.add(new_claim)
    db.session.commit()

    return jsonify({
        "message": "Claim submitted and analyzed successfully!",
        "claim_id": new_claim.claim_id_str,
        "prediction": assessment["decision"],
        "risk_score": assessment["risk_score"],
        "reasons": assessment["reasons"],
        "eob": assessment["eob"],
    }), 201


@app.get("/api/claims")
def list_claims():
    claims = Claim.query.order_by(Claim.created_at.desc()).all()
    out = []
    for c in claims:
        out.append({
            "id": c.claim_id_str,
            "status": c.status,
            "procedure": c.claim_description,
            "amount": c.claim_amount,
        })
    return jsonify(out)


@app.get("/api/claims/<claim_id>")
def get_claim(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first_or_404()
    return jsonify({
        "id": c.claim_id_str,
        "status": c.status,
        "procedure": c.claim_description,
        "amount": c.claim_amount,
        "ai_prediction": c.ai_prediction,
        "nlp_extracted_amount": c.nlp_extracted_amount,
        "risk_score": c.risk_score or 0,
        "decision_reason": c.decision_reason or "",
        "signals": json.loads(c.signals_json or "{}"),
        "eob": json.loads(c.eob_json or "{}"),
    })


@app.post("/api/claims/<claim_id>/decision")
def set_claim_decision(claim_id):
    data = request.get_json() or {}
    decision = data.get("decision")
    note = data.get("note", "")

    c = Claim.query.filter_by(claim_id_str=claim_id).first_or_404()
    mapping = {"approve": "Approved", "reject": "Rejected", "manual_review": "Manual Review"}
    if decision in mapping:
        c.status = mapping[decision]
        c.ai_prediction = c.status
        db.session.add(ClaimHistory(
            claim_id=c.id, action=decision, actor_email="insurer@test.com", note=note
        ))
        db.session.commit()
        return jsonify({"message": "updated", "status": c.status})
    return jsonify({"message": "invalid decision"}), 400


# ======================
# CLI seed + auto-seed
# ======================
@app.cli.command("init-db")
def init_db_command():
    """Create tables if missing and seed two demo users (non-destructive)."""
    db.drop_all()
    db.create_all()
    if not User.query.filter_by(email="insurer@test.com").first():
        db.session.add(User(
            email="insurer@test.com",
            password=bcrypt.generate_password_hash("insurer123").decode("utf-8"),
            role="insurer",
        ))
    if not User.query.filter_by(email="user@test.com").first():
        db.session.add(User(
            email="user@test.com",
            password=bcrypt.generate_password_hash("user123").decode("utf-8"),
            role="policyholder",
        ))
    db.session.commit()
    print("Initialized DB and demo users.")


def ensure_db_seed():
    """Auto-run at startup on platforms like App Runner."""
    with app.app_context():
        db.create_all()
        if not User.query.first():
            db.session.add(User(
                email="user@test.com",
                password=bcrypt.generate_password_hash("user123").decode("utf-8"),
                role="policyholder",
            ))
            db.session.add(User(
                email="insurer@test.com",
                password=bcrypt.generate_password_hash("insurer123").decode("utf-8"),
                role="insurer",
            ))
            db.session.commit()
            print("[DB] Created tables and seeded default users.")

ensure_db_seed()

# ======================
# Entrypoint
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
