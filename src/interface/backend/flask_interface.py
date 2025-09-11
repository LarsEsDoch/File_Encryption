import io
import os
import shutil
import zipfile
from threading import Lock

from flask import Flask, request, render_template, send_file, jsonify

from src.decryption.decryption import decrypt_directory
from src.encryption.encryption import encrypt_directory
from src.utils.utils import create_upload_directory, save_file_with_structure, delete_file, delete_old_upload_dirs, \
    clear_output_directory

active_sessions = set()
session_lock = Lock()

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

    if not session_id or not uploaded_files:
        return {'error': 'Missing session ID or uploaded files'}, 400

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

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

    total_saved_files = len(saved_files)

    with session_lock:
        if session_id in active_sessions:
            active_sessions.remove(session_id)
    if total_saved_files == 0:
        return {'error': 'No files saved'}, 500
    elif total_saved_files == 1:
        return {'message': f"{total_saved_files} file uploaded successfully!"}
    else:
        return {'message': f"{total_saved_files} files uploaded successfully!"}

@app.route('/remove-folder', methods=['POST'])
def remove_folder():
    folder_name = request.form.get('folderName')
    session_id = request.form.get('sessionID')

    if not folder_name or session_id is None:
        return {'error': 'Missing folder name or session ID'}, 400

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

    if '..' in folder_name:
        return {'error': 'Invalid folder name'}, 400

    try:
        shutil.rmtree(os.path.join('files/web/uploads/' + session_id) +"/" + folder_name)
    except Exception as e:
        return {'error': f'Error deleting folder {folder_name}: {str(e)}'}, 500
    finally:
        with session_lock:
            if session_id in active_sessions:
                active_sessions.remove(session_id)

    return {'message': 'Folder deleted successfully!'}

@app.route('/remove-file', methods=['POST'])
def remove_file():
    filepath = request.form.get('filePath')
    filename = request.form.get('fileName')
    session_id = request.form.get('sessionID')

    if not filepath or not filename or session_id is None:
        return {'error': 'Missing file path, name or session ID'}, 400

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

    if '..' in filepath or '..' in filename:
        return {'error': 'Invalid file path'}, 400

    file = filepath + "/" + filename

    try:
        delete_file(os.path.join('files/web/uploads/' + session_id) + file)
    except Exception as e:
        return {'error': f'Error deleting file {filename}: {str(e)}'}, 500
    finally:
        with session_lock:
            if session_id in active_sessions:
                active_sessions.remove(session_id)

    return {'message': 'File deleted successfully!'}


@app.route('/encrypt-files', methods=['POST'])
def encrypt_files():
    password = request.form.get('password')
    session_id = request.form.get('sessionID')

    if not session_id or not password:
        return {'error': 'Missing session ID or password'}, 400

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

    clear_output_directory(session_id)

    try:
        encrypted_files = encrypt_directory(password, 1, session_id)
    except Exception as e:
        with session_lock:
            active_sessions.remove(session_id)
        return {'error': f'Error encrypting files: {str(e)}'}, 500
    finally:
        with session_lock:
            if session_id in active_sessions:
                active_sessions.remove(session_id)

    if encrypted_files is None or encrypted_files == 0:
        return {'error': 'Unknown error occurred!'}, 400
    elif encrypted_files == 1:
        return {'message': '1 File encrypted successfully!'}
    else:
        return {'message': f'{encrypted_files} files encrypted successfully!'}


@app.route('/decrypt-files', methods=['POST'])
def decrypt_files():
    password = request.form.get('password')
    session_id = request.form.get('sessionID')

    if not session_id or not password:
        return {'error': 'Missing session ID or password'}, 400

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

    clear_output_directory(session_id)

    try:
        result = decrypt_directory(password, 1, session_id)

        if result is None:
            clear_output_directory(session_id)
            return {'error': 'No files found to decrypt'}, 400

        total_files, total_encrypted_files, decrypted_files, password_errors = result

        if decrypted_files == 0:
            clear_output_directory(session_id)

            if total_encrypted_files == 0 or total_encrypted_files != total_files:
                return {'error': 'No encrypted files found'}, 400
            if password_errors == total_encrypted_files:
                return {'error': 'No files with that password could be found'}, 400
            return {'error': 'No files could be decrypted'}, 400

        response = {
            'message': f'{decrypted_files} file(s) decrypted successfully!'
        }

        if total_encrypted_files != total_files or password_errors > 0:
            response['status'] = 'warning'

            if password_errors > 0:
                response['warning_password'] = f'{password_errors} file(s) skipped due to wrong password'

            mismatch_count = total_files - total_encrypted_files
            if mismatch_count > 0:
                response['warning_mismatch'] = f'{mismatch_count} unencrypted file(s)'

        return response, 200
    except Exception as e:
        clear_output_directory(session_id)
        with session_lock:
            active_sessions.remove(session_id)
        return {'error': f'Error decrypting file: {str(e)}'}, 500
    finally:
        with session_lock:
            if session_id in active_sessions:
                active_sessions.remove(session_id)


@app.route("/files", methods=['POST'])
def files():
    session_id = request.form.get('sessionID')

    if not session_id:
        return {'error': 'Missing session ID'}, 400

    output_dir = os.path.join("files", "web", "output", session_id)
    upload_dir = os.path.join('files/web/uploads/' + session_id)
    if not upload_dir or not os.path.exists(output_dir):
        return jsonify({"files": []})

    file_list = []
    for root, dirs, output_files in os.walk(output_dir):
        for f in output_files:
            rel_path = os.path.relpath(os.path.join(root, f), output_dir)
            file_list.append(rel_path)

    return jsonify({"files": file_list})


@app.route("/download-file", methods=['POST'])
def download_file():
    session_id = request.form.get('sessionID')
    file_path = request.form.get('filePath')

    if not session_id or not file_path:
        return {'error': 'Missing session ID or file path'}, 400

    if '..' in file_path:
        return {'error': 'Invalid file path'}, 400

    output_dir = os.path.join(BASE_DIR, 'files', 'web', 'output', session_id)
    full_file_path = os.path.join(output_dir, file_path)

    if not full_file_path.startswith(output_dir):
        return {'error': 'Invalid file path'}, 500

    try:
        if not os.path.exists(full_file_path):
            return {'error': f'File {file_path} not found'}, 404

        filename = os.path.basename(file_path)
        return send_file(
            full_file_path,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return {'error': f'Error downloading file: {str(e)}'}, 500


@app.route("/download-folder", methods=['POST'])
def download_folder():
    folder_name = request.form.get('folderName')
    session_id = request.form.get('sessionID')

    if '..' in folder_name:
        return {'error': 'Invalid folder name'}, 400

    if not session_id or not folder_name:
        return {'error': 'Missing session ID or folder name'}, 400

    folder = os.path.join('files/web/output/' + session_id + "/" + folder_name)

    zip_buffer = io.BytesIO()

    if not os.path.exists(folder):
        return {'error': f'Session not found'}, 404
    try:
        with zipfile.ZipFile(zip_buffer, "w") as zipf:
            for root, dirs, dir_files in os.walk(folder):
                for file in dir_files:
                    file_path = os.path.join(root, file)
                    archive_name = os.path.relpath(file_path, folder)
                    zipf.write(file_path, archive_name)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f"{os.listdir(folder)}.zip",
            mimetype="application/zip"
        )
    except Exception as e:
        return {'error': f'Error downloading folder: {str(e)}'}, 500


@app.route("/download-all", methods=['POST'])
def download_all():
    session_id = request.form.get('sessionID')

    if not session_id:
        return {'error': 'Missing session ID'}, 400

    folder = os.path.join('files/web/output/' + session_id)

    zip_buffer = io.BytesIO()

    if not os.path.exists(folder):
        return {'error': f'Session not found'}, 404
    try:
        with zipfile.ZipFile(zip_buffer, "w") as zipf:
            for root, dirs, dir_files in os.walk(folder):
                for file in dir_files:
                    file_path = os.path.join(root, file)
                    archive_name = os.path.relpath(file_path, folder)
                    zipf.write(file_path, archive_name)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f"{os.listdir(folder)}.zip",
            mimetype="application/zip"
        )
    except Exception as e:
        return {'error': f'Error downloading folder: {str(e)}'}, 500


@app.route("/remove-session", methods=['POST'])
def remove_session():
    session_id = request.form.get('sessionID')

    with session_lock:
        if session_id in active_sessions:
            return {'error': 'Session is busy with another operation'}, 400
        active_sessions.add(session_id)

    if not session_id:
        return {'error': 'Missing session ID'}, 400

    upload_dir = os.path.join('files/web/uploads/' + session_id)
    output_dir = os.path.join('files/web/output/' + session_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    delete_old_upload_dirs()
    with session_lock:
        if session_id in active_sessions:
            active_sessions.remove(session_id)
    return jsonify({"message": "Session removed successfully!"})


def run_flask():
    app.run(debug=True, use_reloader=False)