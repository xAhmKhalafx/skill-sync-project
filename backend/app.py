import os
import time
import fitz # PyMuPDF
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt # --- NEW IMPORT ---

# --- APP SETUP ---
app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app) # --- NEW ---

# --- DATABASE CONFIGURATION ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'claims.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- NEW: USER DATABASE MODEL ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='policyholder') # 'policyholder' or 'insurer'

# --- EXISTING CLAIM DATABASE MODEL ---
class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id_str = db.Column(db.String(100), unique=True, nullable=False)
    # --- NEW: ADD FIELDS FROM YOUR NEW FORM ---
    full_name = db.Column(db.String(100), nullable=True)
    email_address = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    claim_amount = db.Column(db.Float, nullable=True)
    claim_description = db.Column(db.Text, nullable=True)
    # --- NLP EXTRACTED DATA WILL GO HERE ---
    nlp_extracted_amount = db.Column(db.Float, nullable=True)
    # --- AI ASSESSMENT ENGINE RESULT ---
    ai_prediction = db.Column(db.String(50), nullable=True)
    
    status = db.Column(db.String(50), nullable=False, default='Processing')
    file_path = db.Column(db.String(300), nullable=True)

# --- NEW: API ENDPOINTS FOR USER AUTHENTICATION ---
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
        # In a real app, you would return a JWT token here for session management.
        # For the demo, we'll just return the user's role.
        return jsonify({'message': 'Login successful!', 'role': user.role})
    return jsonify({'message': 'Login failed! Check email and password.'}), 401


# --- EXISTING API ENDPOINTS (Will be modified later) ---
@app.route('/api/submit', methods=['POST'])
def submit_claim():
    # We will upgrade this function in the next step
    return jsonify({'message': 'Submit endpoint is ready for upgrade.'})

@app.route('/api/claims', methods=['GET'])
def get_claims():
    all_claims = Claim.query.all()
    # This will need to be updated to return dictionaries
    return jsonify([{'id': c.claim_id_str, 'status': c.status} for c in all_claims])


# --- Custom CLI Command ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    db.create_all()
    print("Initialized the database with User and Claim tables.")

if __name__ == '__main__':
    app.run(debug=True, port=5001)