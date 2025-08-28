import os
from flask import Flask, request, render_template

from src.utils.utils import create_upload_directory, save_file_with_structure, delete_file

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, 'web')
lastDir = None

app = Flask(__name__, template_folder=WEB_DIR, static_folder=WEB_DIR)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    global lastDir
    upload_dir = create_upload_directory()
    lastDir = upload_dir

    uploaded_files = request.files.getlist('files')

    if not uploaded_files or all(f.filename == '' for f in uploaded_files):
        return {'error': 'No files selected'}, 400

    saved_files = []

    for uploaded_file in uploaded_files:
        if uploaded_file.filename != '':
            try:
                file_path = save_file_with_structure(uploaded_file, upload_dir)
                saved_files.append({
                    'original_name': uploaded_file.filename,
                    'saved_path': file_path
                })
            except Exception as e:
                return {'error': f'Error saving file {uploaded_file.filename}: {str(e)}'}, 500

    return {
        'message': f"{len(saved_files)} files uploaded successfully!",
        'files': saved_files,
        'upload_directory': upload_dir
    }

@app.route('/remove-file', methods=['POST'])
def remove_file():
    filePath = request.form.get('filePath')
    fileName = request.form.get('fileName')
    file = filePath + "/" + fileName
    print(file)
    try:
        delete_file(lastDir + file)
    except Exception as e:
        return {'error': f'Error deleting file {fileName}: {str(e)}'}, 500

    return {'message': 'File deleted successfully!'}


def run_flask():
    app.run(debug=True, use_reloader=False)