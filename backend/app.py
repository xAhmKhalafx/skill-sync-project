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
    full_name = request.form.get('fullName')
    email = request.form.get('email')
    phone = request.form.get('phone')
    description = request.form.get('description')
    amount = request.form.get('amount', type=float)
    file = request.files.get('file')

    if not file:
        return jsonify({'error': 'No document file part'}), 400

    # 1. Save File
    filename = f"{int(time.time())}_{file.filename}"
    upload_folder = os.path.join(basedir, 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    # 2. NLP Analysis
    raw_text = extract_text_from_file(file_path)
    nlp_data = nlp_parse_text(raw_text)

    # 3. AI Assessment/Fraud Prediction
    ai_prediction_result = predict_claim(request.form) # Pass form data to predictor

    # 4. Save to Database
    new_claim = Claim(
        claim_id_str=f"C-{int(time.time())}",
        full_name=full_name,
        email_address=email,
        phone_number=phone,
        claim_amount=amount,
        claim_description=description,
        file_path=file_path,
        nlp_extracted_amount=nlp_data.get('nlp_extracted_amount'),
        ai_prediction=ai_prediction_result,
        status=ai_prediction_result
    )
    db.session.add(new_claim)
    db.session.commit()

    return jsonify({'message': 'Claim submitted and analyzed successfully!', 'claim_id': new_claim.claim_id_str}), 201

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