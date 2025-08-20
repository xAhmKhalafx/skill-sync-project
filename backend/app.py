import os
import time
import re
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# --- OCR AND DOCUMENT PROCESSING IMPORTS ---
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import uuid
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ---------- OCR ----------
def extract_text_from_file(file_path: str) -> str:
    """Prefer digital text for PDFs. Fallback to OCR for image-only PDFs/images."""
    text = ""
    try:
        if file_path.lower().endswith(".pdf"):
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text("text")
                    if page_text and page_text.strip():
                        text += page_text + "\n"
                    else:
                        # rasterize page and OCR
                        pix = page.get_pixmap(dpi=300)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        text += pytesseract.image_to_string(img) + "\n"
        else:
            text = pytesseract.image_to_string(Image.open(file_path))
    except Exception as e:
        print(f"[OCR] Error extracting text: {e}")
    return text or ""

# ---------- NLP parsing ----------
_amount_patterns = [
    r"Amount\s*Claimed[:\s]*\$?([\d,]+\.\d{2})",
    r"Claim\s*Amount[:\s]*\$?([\d,]+\.\d{2})",
    r"Amount\s*Billed[:\s]*\$?([\d,]+\.\d{2})",
    r"Invoice\s*Total[:\s]*\$?([\d,]+\.\d{2})",
    r"Total\s*Amount\s*Due[:\s]*\$?([\d,]+\.\d{2})",
    r"Total[:\s]*\$?([\d,]+\.\d{2})",
]

def _grab_amount(text: str, keywords=("claimed","bill","billed","invoice","total","due")):
    """Return the first amount found and a tag describing what it likely is."""
    for rx in _amount_patterns:
        m = re.search(rx, text, flags=re.IGNORECASE)
        if m:
            amt = float(m.group(1).replace(",", ""))
            # crude label based on nearby keyword
            window = 30
            s = m.start()
            ctx = text[max(0, s - window): s + window].lower()
            label = next((k for k in keywords if k in ctx), "amount")
            return amt, label
    return None, None

def _grab_field(text: str, field: str):
    """
    Extract simple line-based fields like 'Diagnosis:' or 'Hospital:'.
    Returns the value string or '' if not found.
    """
    m = re.search(rf"{field}\s*:\s*(.+)$", text, flags=re.IGNORECASE | re.MULTILINE)
    return (m.group(1).strip() if m else "")

def nlp_parse_text(text: str, full_name: str = "", hospital_hint: str = "") -> dict:
    """
    Parse basic fields:
      - amounts: claimed & billed (if both detected)
      - diagnosis text
      - hospital name
      - simple matches to compute features
    """
    claimed, claimed_tag = _grab_amount(text, keywords=("claim", "claimed"))
    billed, billed_tag = _grab_amount(text, keywords=("bill", "billed", "invoice", "total", "due"))

    # try to avoid the same number being used for both
    if claimed is not None and billed is not None and abs(claimed - billed) < 1e-6:
        # If both are exactly equal and tags are ambiguous, keep as is; dataset treats 'match_amount' separately
        pass

    diagnosis = _grab_field(text, "Diagnosis")
    hospital = _grab_field(text, "Hospital") or hospital_hint or ""

    # Feature helpers
    diag_len = len(diagnosis.strip())
    hosp_len = len(hospital.strip())
    match_amount = 1 if (claimed is not None and billed is not None and abs(claimed - billed) < 0.001) else 0
    match_patient = 1 if (full_name and full_name.lower() in text.lower()) else 0
    # If we have a hospital name, check presence; else fall back to the word 'hospital' occurrence
    match_hospital = 1 if (hospital and hospital.lower() in text.lower()) else (1 if "hospital" in text.lower() else 0)

    # Choose a "claim amount" default if only one amount is found
    amount_claim = claimed if claimed is not None else billed
    amount_bill = billed if billed is not None else claimed
    amount_diff = None
    if amount_claim is not None and amount_bill is not None:
        amount_diff = round(float(abs(amount_claim - amount_bill)), 2)

    parsed = {
        "amount_claim": amount_claim,
        "amount_bill": amount_bill,
        "diag_len": diag_len,
        "hosp_len": hosp_len,
        "match_amount": match_amount,
        "match_patient": match_patient,
        "match_hospital": match_hospital,
        "amount_diff": amount_diff,
        # keep some raw fields for debugging
        "diagnosis": diagnosis,
        "hospital": hospital,
        "claimed_tag": claimed_tag,
        "billed_tag": billed_tag,
    }
    print(f"[NLP] Parsed: {parsed}")
    return parsed

# ---------- Feature builder for your RF model ----------
FEATURE_ORDER = [
    "amount_claim", "amount_bill", "diag_len", "hosp_len",
    "match_amount", "match_patient", "match_hospital", "amount_diff"
]

def build_features(parsed: dict) -> pd.DataFrame:
    """Build a one-row DataFrame with the exact feature columns your RF expects."""
    row = {}
    for col in FEATURE_ORDER:
        val = parsed.get(col)
        # Fallbacks: numeric zeros are okay for demo; you can refine later
        if val is None:
            val = 0
        row[col] = [val]
    return pd.DataFrame(row)

# ---------- Model prediction + rules ----------
def predict_claim_with_model(parsed: dict):
    """
    Try RF model; if not available or errors, fall back to simple rules.
    Return (decision, reason).
    """
    # 1) simple fraud heuristics (used as fallback and tie-breaker)
    fraud_score = 0
    if parsed.get("amount_diff", 0) > 50:  # large difference between billed and claimed
        fraud_score += 1
    if parsed.get("match_patient", 0) == 0:
        fraud_score += 1
    if parsed.get("match_hospital", 0) == 0:
        fraud_score += 1

    # 2) model
    if model is not None:
        try:
            X = build_features(parsed)
            y = model.predict(X)
            model_ok = int(y[0]) == 1
            # if model rejects OR fraud_score high, reject
            if not model_ok:
                return "Rejected", "Model rejected based on features"
            if fraud_score >= 2:
                return "Rejected", f"High fraud indicators (score={fraud_score})"
            return "Approved", "Model approved"
        except Exception as e:
            print(f"[ML] Error during prediction: {e}")

    # 3) fallback only rules
    if fraud_score >= 2:
        return "Rejected", f"High fraud indicators (score={fraud_score})"
    # If amounts match and we have basic matches, approve
    if parsed.get("match_amount", 0) == 1 and parsed.get("match_patient", 0) == 1:
        return "Approved", "Heuristics: amount & patient match"
    # otherwise conservative
    return "Rejected", "Heuristics: insufficient matches"

# Note: You may need to specify the path to your Tesseract installation
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# --- APP SETUP ---
app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# --- DATABASE CONFIGURATION ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'claims.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- LOAD THE PRE-TRAINED AI MODEL ---
try:
    model = joblib.load('models/rf_model.pkl')
    print("AI model loaded successfully.")
except FileNotFoundError:
    model = None
    print("AI model not found. /predict endpoint will not work.")

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='policyholder')

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
    status = db.Column(db.String(50), nullable=False, default='Processing')
    file_path = db.Column(db.String(300), nullable=True)

# --- AI & NLP FUNCTIONS ---
def extract_text_from_file(file_path):
    """Extracts text from PDF or image files."""
    text = ""
    try:
        if file_path.lower().endswith('.pdf'):
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
        elif file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            text = pytesseract.image_to_string(Image.open(file_path))
        print("--- Text extracted successfully ---")
    except Exception as e:
        print(f"Error extracting text: {e}")
    return text

def nlp_parse_text(text):
    """Uses regular expressions to find specific details in the extracted text."""
    amount_pattern = r'Total Amount Due:? \$?(\d+\.\d{2})'
    amount_match = re.search(amount_pattern, text)
    extracted_amount = float(amount_match.group(1)) if amount_match else None
    print(f"--- NLP found amount: {extracted_amount} ---")
    return {'nlp_extracted_amount': extracted_amount}

def predict_claim(data):
    """Makes a prediction using the loaded Random Forest model."""
    if not model:
        return "Model not loaded"
    try:
        # The model expects a DataFrame with specific columns.
        # This example uses dummy data, as the form doesn't collect these details.
        input_data = pd.DataFrame({
            'age': [35],
            'bmi': [25.0],
            'children': [1],
            'smoker': [0],
            'region': [2]
        })
        prediction = model.predict(input_data)
        result = "Approved" if prediction[0] == 1 else "Rejected"
        print(f"--- AI prediction: {result} ---")
        return result
    except Exception as e:
        print(f"Error during prediction: {e}")
        return "Error in prediction"


# --- API ENDPOINTS ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(email=data['email'], password=hashed_password, role=data.get('role', 'policyholder'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'New user created!'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Login successful!', 'role': user.role})
    return jsonify({'message': 'Login failed! Check email and password.'}), 401

@app.route('/api/submit', methods=['POST'])
def submit_claim():
    full_name = request.form.get('fullName', '') or ''
    email = request.form.get('email', '') or ''
    phone = request.form.get('phone', '') or ''
    description = request.form.get('description', '') or ''
    amount = request.form.get('amount', type=float)
    file = request.files.get('file')

    if not file or file.filename == '':
        return jsonify({'error': 'No document file provided'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: pdf, jpg, jpeg, png'}), 415

    # Save with a safe + unique name
    upload_folder = os.path.join(basedir, 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    safe_name = secure_filename(file.filename)
    filename = f"{int(time.time())}_{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    # OCR + NLP
    raw_text = extract_text_from_file(file_path)
    parsed = nlp_parse_text(raw_text, full_name=full_name, hospital_hint='')
    # tie the UI 'amount' to parsed if missing
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
        'message': 'Claim submitted and analyzed successfully!',
        'claim_id': new_claim.claim_id_str,
        'prediction': decision,
        'reason': reason,
        'parsed': {
            'amount_claim': parsed.get('amount_claim'),
            'amount_bill': parsed.get('amount_bill'),
            'amount_diff': parsed.get('amount_diff'),
            'match_amount': parsed.get('match_amount'),
            'match_patient': parsed.get('match_patient'),
            'match_hospital': parsed.get('match_hospital'),
        }
    }), 201


@app.route('/api/claims', methods=['GET'])
def get_claims():
    # This endpoint can be updated later to show more detail
    all_claims = Claim.query.all()
    claims_list = [{'id': c.claim_id_str, 'status': c.status, 'procedure': c.claim_description, 'amount': c.claim_amount} for c in all_claims]
    return jsonify(claims_list)

# --- Custom CLI Command ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables and adds test users."""
    db.drop_all()
    db.create_all()

    hashed_password_insurer = bcrypt.generate_password_hash('insurer123').decode('utf-8')
    insurer_user = User(email='insurer@test.com', password=hashed_password_insurer, role='insurer')
    db.session.add(insurer_user)

    hashed_password_user = bcrypt.generate_password_hash('user123').decode('utf-8')
    policyholder_user = User(email='user@test.com', password=hashed_password_user, role='policyholder')
    db.session.add(policyholder_user)

    db.session.commit()
    print("Initialized the database and created test users.")

if __name__ == '__main__':
    app.run(debug=True, port=5001)