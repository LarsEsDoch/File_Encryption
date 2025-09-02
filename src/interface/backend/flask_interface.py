import io
import os
import shutil
import zipfile

from flask import Flask, request, render_template, send_from_directory, send_file, jsonify

from src.decryption.decryption import decrypt_directory
from src.encryption.encryption import encrypt_directory
from src.utils.utils import create_upload_directory, save_file_with_structure, delete_file

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WEB_DIR = os.path.join(BASE_DIR, 'src', 'interface', 'web')

app = Flask(__name__, template_folder=WEB_DIR, static_folder=WEB_DIR)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    session_id = request.form.get('sessionID')
    upload_dir = create_upload_directory(session_id)

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
    filepath = request.form.get('filePath')
    filename = request.form.get('fileName')
    session_id = request.form.get('sessionID')

    if not filepath or not filename:
        return {'error': 'Missing file path or name'}, 400

    if '..' in filepath or '..' in filename:
        return {'error': 'Invalid file path'}, 400

    file = filepath + "/" + filename
   #file = os.path.join(filepath, filename)
   #lastDir = session.get('lastDir', '')

   #if not lastDir:
   #    return {'error': 'No upload directory found'}, 400

   #try:
   #    delete_file(os.path.join(lastDir, file))

    try:
        delete_file(os.path.join('files/web/uploads/' + session_id) + file)
    except Exception as e:
        return {'error': f'Error deleting file {filename}: {str(e)}'}, 500

    return {'message': 'File deleted successfully!'}


@app.route('/encrypt-files', methods=['POST'])
def encrypt_files():
    password = request.form.get('password')
    session_id = request.form.get('sessionID')
    try:
        encrypt_directory(password, 1, session_id)
    except Exception as e:
        return {'error': f'Error encrypting files: {str(e)}'}, 500

    return {'message': 'File encryption successfully!'}


@app.route('/decrypt-files', methods=['POST'])
def decrypt_files():
    password = request.form.get('password')
    session_id = request.form.get('sessionID')
    try:
        decrypt_directory(password, 1, session_id)
    except Exception as e:
        return {'error': f'Error decrypting files: {str(e)}'}, 500

    return {'message': 'File decryption successfully!'}


@app.route("/download-folder", methods=['POST'])
def download_folder():
    session_id = request.form.get('sessionID')
    folder = os.path.join('files/web/output/' + session_id)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zipf:
        for root, dirs, files in os.walk(folder):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder)
                zipf.write(file_path, arcname)

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=f"{os.listdir(folder)}.zip",
        mimetype="application/zip"
    )


@app.route("/download-file", methods=['POST'])
def download_file():
    session_id = request.form.get('sessionID')
    file_path = request.form.get('filePath')

    if not session_id or not file_path:
        return {'error': 'Missing session ID or file path'}, 400

    output_dir = os.path.join(BASE_DIR, 'files', 'web', 'output', session_id)
    full_file_path = os.path.join(output_dir, file_path)

    if not full_file_path.startswith(output_dir):
        return {'error': 'Invalid file path'}, 400

    try:
        if not os.path.exists(full_file_path):
            print("eee" + full_file_path)
            return {'error': f'File {file_path} not found'}, 404

        filename = os.path.basename(file_path)
        return send_file(
            full_file_path,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"Download error: {str(e)}")
        return {'error': f'Error downloading file: {str(e)}'}, 500


@app.route("/files", methods=['POST'])
def files():
    session_id = request.form.get('sessionID')
    output_dir = os.path.join("files", "web", "output", session_id)
    upload_dir = os.path.join('files/web/uploads/' + session_id)
    if not upload_dir or not os.path.exists(output_dir):
        return jsonify({"files": []})

    file_list = []
    for root, dirs, files in os.walk(output_dir):
        for f in files:
            rel_path = os.path.relpath(os.path.join(root, f), output_dir)
            file_list.append(rel_path)

    return jsonify({"files": file_list})


@app.route("/remove-session", methods=['POST'])
def remove_session():
    session_id = request.form.get('sessionID')
    upload_dir = os.path.join('files/web/uploads/' + session_id)
    output_dir = os.path.join('files/web/output/' + session_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    return jsonify({"message": "Session removed successfully!"})


def run_flask():
    app.run(debug=True, use_reloader=False)