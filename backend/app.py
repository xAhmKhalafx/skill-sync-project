import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# --- APP SETUP ---
app = Flask(__name__)
CORS(app) # Enable Cross-Origin Resource Sharing

# --- DATABASE CONFIGURATION ---
# Sets up the base directory for our project
basedir = os.path.abspath(os.path.dirname(__file__))
# Configures the database to be a file named 'claims.db' inside our project
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'claims.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- DATABASE MODEL ---
# Defines the structure of the 'Claim' table in our database
class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    claim_id_str = db.Column(db.String(100), unique=True, nullable=False)
    procedure = db.Column(db.String(200), nullable=True)
    amount = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Processing')
    file_path = db.Column(db.String(300), nullable=False)

    def to_dict(self):
        """Converts the Claim object to a dictionary for easy JSON serialization."""
        return {
            'id': self.claim_id_str,
            'procedure': self.procedure,
            'amount': self.amount,
            'status': self.status
        }
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    db.create_all()
    print("Initialized the database.")
    
# --- MAIN ROUTE (for testing) ---
@app.route('/')
def hello():
    return "Backend Server is Running!"

# --- ADD OTHER API ROUTES HERE ---
import fitz # PyMuPDF
import time

# Placeholder for the AI processing logic
def process_claim_with_ai(document_path):
    """
    This is a placeholder function.
    In the real project, this would call your NLP and ML models. 
    For now, it just extracts some text and returns mock data.
    """
    try:
        doc = fitz.open(document_path)
        text = ""
        for page in doc:
            text += page.get_text()
        # Here you would use NLP to find procedure, amount, etc.
        print("Extracted Text (mock):", text[:200]) # Print first 200 chars
    except Exception as e:
        print(f"Error reading document: {e}")
    
    # Mock AI results
    return {
        'procedure': 'Annual Check-up (Mock)',
        'amount': 250.00,
        'status': 'Processing'
    }

@app.route('/api/submit', methods=['POST'])
def submit_claim():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # 1. Save the uploaded file
        # Create a unique filename to avoid conflicts
        filename = f"{int(time.time())}_{file.filename}"
        upload_folder = os.path.join(basedir, 'uploads')
        os.makedirs(upload_folder, exist_ok=True) # Ensure the 'uploads' folder exists
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        # 2. Process with (mock) AI
        ai_results = process_claim_with_ai(file_path)

        # 3. Create a new entry in the database
        new_claim = Claim(
            claim_id_str=f"C-{int(time.time())}", # Generate a unique claim ID
            procedure=ai_results['procedure'],
            amount=ai_results['amount'],
            status=ai_results['status'],
            file_path=file_path
        )
        db.session.add(new_claim)
        db.session.commit()

        # 4. Return a success response
        return jsonify({
            'message': 'Claim submitted successfully!',
            'claim_id': new_claim.claim_id_str,
            'status': new_claim.status
        }), 201
@app.route('/api/claims', methods=['GET'])
def get_claims():
    all_claims = Claim.query.all()
    # Convert the list of Claim objects to a list of dictionaries
    claims_list = [claim.to_dict() for claim in all_claims]
    return jsonify(claims_list)

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Creates the database tables if they don't exist
    app.run(debug=True, port=5001)