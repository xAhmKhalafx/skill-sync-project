import os
import re
import time
import uuid
import warnings

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from sqlalchemy.exc import OperationalError

import joblib
import pandas as pd

# OCR / files
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
from werkzeug.utils import secure_filename


# ===============================
# App & Config (create app FIRST)
# ===============================
app = Flask(__name__)

# Environment-driven config
DEFAULT_DB = "sqlite:////tmp/claims.db"  # container-friendly default
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", DEFAULT_DB)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH_MB", "10")) * 1024 * 1024  # 10 MB default

# CORS: allow local dev + Netlify (override with CORS_ORIGINS env: comma-separated)
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://skill-sync-ai-health-claim.netlify.app"
)
CORS(app, resources={r"/api/*": {"origins": [o.strip() for o in cors_origins.split(",") if o.strip()]}})

# Extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# Quiet a harmless sklearn warning
warnings.filterwarnings("ignore", message="X has feature names")

# Tesseract path (inside Docker it’s /usr/bin/tesseract)
try:
    pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD", pytesseract.pytesseract.tesseract_cmd)
except Exception as _e:
    print("[OCR] Tesseract setup note:", _e)


# ===========
# DB Models
# ===========
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="policyholder")


class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id_str = db.Column(db.String(100), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=True)
    email_address = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    claim_amount = db.Column(db.Float, nullable=True)
    claim_description = db.Column(db.Text, nullable=True)
    nlp_extracted_amount = db.Column(db.Float, nullable=True)
    ai_prediction = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Processing")
    file_path = db.Column(db.String(300), nullable=True)


# =======================
# Model load (RandomForest)
# =======================
model = None
try:
    model = joblib.load(os.path.join(os.path.dirname(__file__), "models", "rf_model.pkl"))
    print("AI model loaded successfully.")
except FileNotFoundError:
    print("AI model not found. Prediction will use heuristics.")
except Exception as e:
    print(f"AI model load error: {e}")


# =======================
# Helpers: uploads & OCR
# =======================
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file_path: str) -> str:
    """Prefer digital text for PDFs; fallback to OCR for image-only pages or images."""
    text = ""
    try:
        if file_path.lower().endswith(".pdf"):
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text("text")
                    if page_text and page_text.strip():
                        text += page_text + "\n"
                    else:
                        pix = page.get_pixmap(dpi=300)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        text += pytesseract.image_to_string(img) + "\n"
        else:
            text = pytesseract.image_to_string(Image.open(file_path))
        print("--- Text extracted successfully ---")
    except Exception as e:
        print(f"[OCR] Error extracting text: {e}")
    return text or ""


# ===========================
# NLP parsing & feature build
# ===========================
_amount_patterns = [
    r"Amount\s*Claimed[:\s]*\$?([\d,]+\.\d{2})",
    r"Claim\s*Amount[:\s]*\$?([\d,]+\.\d{2})",
    r"Amount\s*Billed[:\s]*\$?([\d,]+\.\d{2})",
    r"Invoice\s*Total[:\s]*\$?([\d,]+\.\d{2})",
    r"Total\s*Amount\s*Due[:\s]*\$?([\d,]+\.\d{2})",
    r"Total[:\s]*\$?([\d,]+\.\d{2})",
]

def _grab_amount(text: str, keywords=("claim", "claimed", "bill", "billed", "invoice", "total", "due")):
    for rx in _amount_patterns:
        m = re.search(rx, text, flags=re.IGNORECASE)
        if m:
            amt = float(m.group(1).replace(",", ""))
            window = 30
            s = m.start()
            ctx = text[max(0, s - window): s + window].lower()
            label = next((k for k in keywords if k in ctx), "amount")
            return amt, label
    return None, None

def _grab_field(text: str, field: str):
    m = re.search(rf"{field}\s*:\s*(.+)$", text, flags=re.IGNORECASE | re.MULTILINE)
    return (m.group(1).strip() if m else "")

def nlp_parse_text(text: str, full_name: str = "", hospital_hint: str = "") -> dict:
    """Preferred new signature: parse amounts, diagnosis, hospital; compute matches & diffs."""
    claimed, _ = _grab_amount(text, keywords=("claim", "claimed"))
    billed, _  = _grab_amount(text, keywords=("bill", "billed", "invoice", "total", "due"))

    diagnosis = _grab_field(text, "Diagnosis")
    hospital  = _grab_field(text, "Hospital") or hospital_hint or ""

    diag_len = len(diagnosis.strip())
    hosp_len = len(hospital.strip())
    match_amount   = 1 if (claimed is not None and billed is not None and abs(claimed - billed) < 0.001) else 0
    match_patient  = 1 if (full_name and full_name.lower() in text.lower()) else 0
    match_hospital = 1 if (hospital and hospital.lower() in text.lower()) else (1 if "hospital" in text.lower() else 0)

    amount_claim = claimed if claimed is not None else billed
    amount_bill  = billed  if billed  is not None else claimed
    amount_diff  = None
    if amount_claim is not None and amount_bill is not None:
        amount_diff = round(abs(amount_claim - amount_bill), 2)

    parsed = {
        "amount_claim": amount_claim,
        "amount_bill": amount_bill,
        "diag_len": diag_len,
        "hosp_len": hosp_len,
        "match_amount": match_amount,
        "match_patient": match_patient,
        "match_hospital": match_hospital,
        "amount_diff": amount_diff,
        "diagnosis": diagnosis,
        "hospital": hospital,
        "nlp_extracted_amount": amount_claim,
    }
    print(f"[NLP] Parsed: {parsed}")
    return parsed

def nlp_parse_text_compat(text: str, full_name: str = "", hospital_hint: str = "") -> dict:
    """Compatibility wrapper so old nlp_parse_text(text) also works if still present somewhere."""
    try:
        return nlp_parse_text(text, full_name=full_name, hospital_hint=hospital_hint)
    except TypeError:
        base = nlp_parse_text(text) if callable(nlp_parse_text) else {}
        base = base or {}
        amount_claim = base.get("amount_claim")
        amount_bill  = base.get("amount_bill")
        base["match_patient"]  = 1 if (full_name and full_name.lower() in text.lower()) else 0
        base["match_hospital"] = 1 if ("hospital" in text.lower()) else 0 if base.get("match_hospital") is None else base["match_hospital"]
        if amount_claim is not None and amount_bill is not None:
            base["amount_diff"]  = round(abs(float(amount_claim) - float(amount_bill)), 2)
            base["match_amount"] = 1 if abs(float(amount_claim) - float(amount_bill)) < 0.001 else 0
        else:
            base.setdefault("amount_diff", 0)
            base.setdefault("match_amount", 0)
        base.setdefault("nlp_extracted_amount", amount_claim if amount_claim is not None else amount_bill)
        return base

FEATURE_ORDER = [
    "amount_claim", "amount_bill", "diag_len", "hosp_len",
    "match_amount", "match_patient", "match_hospital", "amount_diff"
]

def build_features(parsed: dict) -> pd.DataFrame:
    row = {}
    for col in FEATURE_ORDER:
        val = parsed.get(col)
        if val is None:  # conservative fill
            val = 0
        row[col] = [val]
    return pd.DataFrame(row)

def predict_claim_with_model(parsed: dict):
    """Use RF model when available; blend with simple fraud rules."""
    # simple heuristics
    fraud_score = 0
    if parsed.get("amount_diff", 0) > 50:
        fraud_score += 1
    if parsed.get("match_patient", 0) == 0:
        fraud_score += 1
    if parsed.get("match_hospital", 0) == 0:
        fraud_score += 1

    if model is not None:
        try:
            X = build_features(parsed)
            y = model.predict(X)
            model_ok = int(y[0]) == 1
            if not model_ok:
                return "Rejected", "Model rejected based on features"
            if fraud_score >= 2:
                return "Rejected", f"High fraud indicators (score={fraud_score})"
            return "Approved", "Model approved"
        except Exception as e:
            print(f"[ML] Error during prediction: {e}")

    # fallback heuristics only
    if fraud_score >= 2:
        return "Rejected", f"High fraud indicators (score={fraud_score})"
    if parsed.get("match_amount", 0) == 1 and parsed.get("match_patient", 0) == 1:
        return "Approved", "Heuristics: amount & patient match"
    return "Rejected", "Heuristics: insufficient matches"


# ===========
# API Routes
# ===========
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/register")
def register():
    data = request.get_json() or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"message": "Email and password required"}), 400
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "User already exists"}), 400
    hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    user = User(email=data["email"], password=hashed, role=data.get("role", "policyholder"))
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "New user created!"}), 201

@app.post("/api/login")
def login():
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get("email", "")).first()
    if user and bcrypt.check_password_hash(user.password, data.get("password", "")):
        # If later you add JWT, return access_token here
        return jsonify({"message": "Login successful!", "role": user.role}), 200
    return jsonify({"message": "Login failed! Check email and password."}), 401

@app.post("/api/submit")
def submit_claim():
    full_name = request.form.get("fullName", "") or ""
    email = request.form.get("email", "") or ""
    phone = request.form.get("phone", "") or ""
    description = request.form.get("description", "") or ""
    amount = request.form.get("amount", type=float)
    file = request.files.get("file")

    if not file or file.filename == "":
        return jsonify({"error": "No document file provided"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: pdf, jpg, jpeg, png"}), 415

    # Save file safely (container-friendly path)
    upload_folder = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    os.makedirs(upload_folder, exist_ok=True)
    safe_name = secure_filename(file.filename)
    filename = f"{int(time.time())}_{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    # OCR + NLP
    raw_text = extract_text_from_file(file_path)
    parsed = nlp_parse_text_compat(raw_text, full_name=full_name, hospital_hint="")
    # Use user-entered amount if OCR missed it
    if parsed.get("amount_claim") is None and amount is not None:
        parsed["amount_claim"] = float(amount)
        if parsed.get("amount_bill") is None:
            parsed["amount_bill"] = float(amount)
        parsed["amount_diff"] = round(abs(parsed["amount_claim"] - parsed["amount_bill"]), 2)

    decision, reason = predict_claim_with_model(parsed)
    print(f"[DECISION] {decision} — {reason}")

    new_claim = Claim(
        claim_id_str=f"C-{int(time.time())}",
        full_name=full_name,
        email_address=email,
        phone_number=phone,
        claim_amount=amount if amount is not None else parsed.get("amount_claim"),
        claim_description=description,
        file_path=file_path,
        nlp_extracted_amount=parsed.get("amount_claim"),
        ai_prediction=decision,
        status=decision
    )
    db.session.add(new_claim)
    db.session.commit()

    return jsonify({
        "message": "Claim submitted and analyzed successfully!",
        "claim_id": new_claim.claim_id_str,
        "prediction": decision,
        "reason": reason,
        "parsed": {
            "amount_claim": parsed.get("amount_claim"),
            "amount_bill": parsed.get("amount_bill"),
            "amount_diff": parsed.get("amount_diff"),
            "match_amount": parsed.get("match_amount"),
            "match_patient": parsed.get("match_patient"),
            "match_hospital": parsed.get("match_hospital"),
        }
    }), 201

@app.get("/api/claims")
def get_claims():
    all_claims = Claim.query.all()
    claims_list = [{
        "id": c.claim_id_str,
        "status": c.status,
        "procedure": c.claim_description,
        "amount": c.claim_amount
    } for c in all_claims]
    return jsonify(claims_list), 200

@app.get("/api/claims/<claim_id>")
def get_claim(claim_id):
    c = Claim.query.filter_by(claim_id_str=claim_id).first()
    if not c:
        return jsonify({"error": "Claim not found"}), 404
    return jsonify({
        "id": c.claim_id_str,
        "full_name": c.full_name,
        "email": c.email_address,
        "phone": c.phone_number,
        "procedure": c.claim_description,
        "amount": c.claim_amount,
        "status": c.status,
        "ai_prediction": c.ai_prediction,
        "nlp_extracted_amount": c.nlp_extracted_amount,
    }), 200


# ==================
# CLI: init database
# ==================
@app.cli.command("init-db")
def init_db_command():
    """Create tables if missing and seed two demo users (non-destructive)."""
    db.create_all()
    # seed insurer
    if not User.query.filter_by(email="insurer@test.com").first():
        hashed = bcrypt.generate_password_hash("insurer123").decode("utf-8")
        db.session.add(User(email="insurer@test.com", password=hashed, role="insurer"))
    # seed policyholder
    if not User.query.filter_by(email="user@test.com").first():
        hashed = bcrypt.generate_password_hash("user123").decode("utf-8")
        db.session.add(User(email="user@test.com", password=hashed, role="policyholder"))
    db.session.commit()
    print("Initialized the database and ensured demo users exist.")

def ensure_db_seed():
    with app.app_context():
        try:
            db.create_all()
            # seed users if none exist
            if not User.query.first():
                from flask_bcrypt import Bcrypt
                bcrypt = Bcrypt(app)
                u1 = User(email='user@test.com', password=bcrypt.generate_password_hash('user123').decode('utf-8'), role='policyholder')
                u2 = User(email='insurer@test.com', password=bcrypt.generate_password_hash('insurer123').decode('utf-8'), role='insurer')
                db.session.add_all([u1, u2])
                db.session.commit()
                print("[DB] Created tables and seeded default users.")
        except OperationalError as e:
            print(f"[DB] init error: {e}")

ensure_db_seed()
# ===========
# Entrypoint
# ===========
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
