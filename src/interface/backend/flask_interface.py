import os
from flask import Flask, request, render_template

from src.decryption.decryption import decrypt_file


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, 'web')

app = Flask(__name__, template_folder=WEB_DIR, static_folder=WEB_DIR)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    uploaded_file = request.files['file']
    filename = uploaded_file.filename
    upload_path = os.path.join("files/encrypted", filename)
    uploaded_file.save(upload_path)

    decrypt_file("password_here", filename)
    return {'message': f"File {filename} decrypted successfully!"}

def run_flask():
    app.run(debug=True, use_reloader=False)