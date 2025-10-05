import io
import os
import shutil
import zipfile
import uuid
from threading import Lock
from functools import wraps

from flask import Flask, request, render_template, send_file, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room

from src.decryption.decryption import decrypt_directory
from src.encryption.encryption import encrypt_directory
from src.utils.utils import create_upload_directory, save_file_with_structure, delete_file, delete_old_upload_dirs, \
    clear_output_directory

active_sessions = set()
session_lock = Lock()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WEB_DIR = os.path.join(BASE_DIR, 'src', 'interface', 'web')

app = Flask(__name__, template_folder=WEB_DIR, static_folder=WEB_DIR)

socketio = SocketIO(app, cors_allowed_origins="*")

SESSION_COOKIE_NAME = "sessionID"


def get_or_create_session_id_from_request(req):
    sid = req.cookies.get(SESSION_COOKIE_NAME)
    if sid:
        return sid
    return uuid.uuid4().hex


def require_session_cookie(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        session_id = request.cookies.get(SESSION_COOKIE_NAME)
        if not session_id:
            return {'error': 'Missing session cookie'}, 400
        return f(session_id=session_id, *args, **kwargs)
    return wrapper


def safe_add_active(session_id):
    with session_lock:
        if session_id in active_sessions:
            return False
        active_sessions.add(session_id)
        return True


def safe_remove_active(session_id):
    with session_lock:
        if session_id in active_sessions:
            active_sessions.remove(session_id)


def emit_progress(session_id, event_name, payload):
    socketio.emit(event_name, payload)


@socketio.on('connect')
def ws_connect():
    emit('connected', {'message': 'socket connected'})


@socketio.on('join')
def ws_join(data):
    session_id = data.get('sessionID') or request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        emit('error', {'message': 'Missing sessionID for join'})
        return
    join_room(session_id)
    emit('joined', {'message': f'Joined room {session_id}'})


@socketio.on('leave')
def ws_leave(data):
    session_id = data.get('sessionID') or request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        from flask_socketio import leave_room
        leave_room(session_id)
        emit('left', {'message': f'Left room {session_id}'})


@app.route('/')
def index():
    session_id = get_or_create_session_id_from_request(request)
    resp = make_response(render_template('index.html'))
    if not request.cookies.get(SESSION_COOKIE_NAME):
        resp.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=False, samesite='Lax')
    return resp


@app.route('/upload', methods=['POST'])
def upload_file():
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return {'error': 'Missing session cookie'}, 400

    upload_dir = create_upload_directory(session_id)
    uploaded_files = request.files.getlist('files')

    if not uploaded_files:
        return {'error': 'Missing uploaded files'}, 400

    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    try:
        if not uploaded_files or all(f.filename == '' for f in uploaded_files):
            return {'error': 'No files selected'}, 400

        saved_files = []
        total_files = len([f for f in uploaded_files if f.filename != ''])

        emit_progress(session_id, 'operation_started', {"operation": "upload"})

        for file_index, uploaded_file in enumerate(uploaded_files):
            if uploaded_file.filename != '':
                try:
                    progress_percent = int((file_index / total_files) * 100)
                    emit_progress(session_id, 'upload_progress', {
                        "percent": progress_percent,
                        "info": f"Uploading {uploaded_file.filename}",
                        "current": file_index + 1,
                        "total": total_files
                    })

                    file_path = save_file_with_structure(uploaded_file, upload_dir)
                    saved_files.append({
                        'original_name': uploaded_file.filename,
                        'saved_path': file_path
                    })
                except Exception as e:
                    emit_progress(session_id, 'operation_error',
                                  {"error": f'Error saving file {uploaded_file.filename}: {str(e)}'})
                    return {'error': f'Error saving file {uploaded_file.filename}: {str(e)}'}, 500

        total_saved_files = len(saved_files)

        emit_progress(session_id, 'operation_finished', {
            'operation': 'upload',
            "processed": total_saved_files,
            "total": total_files
        })

        if total_saved_files == 0:
            return {'error': 'No files saved'}, 500
        elif total_saved_files == 1:
            return {'message': f"{total_saved_files} file uploaded successfully!"}
        else:
            return {'message': f"{total_saved_files} files uploaded successfully!"}
    finally:
        safe_remove_active(session_id)


@app.route('/remove-folder', methods=['POST'])
@require_session_cookie
def remove_folder(session_id):
    folder_name = request.form.get('folderName')
    if not folder_name:
        return {'error': 'Missing folder name'}, 400

    if '..' in folder_name:
        return {'error': 'Invalid folder name'}, 400

    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    try:
        shutil.rmtree(os.path.join("files", "web", "uploads", session_id, folder_name))
    except Exception as e:
        return {'error': f'Error deleting folder {folder_name}: {str(e)}'}, 500
    finally:
        safe_remove_active(session_id)

    return {'message': 'Folder deleted successfully!'}


@app.route('/remove-file', methods=['POST'])
@require_session_cookie
def remove_file(session_id):
    filepath = request.form.get('filePath')
    filename = request.form.get('fileName')

    if not filepath or not filename:
        return {'error': 'Missing file path or name'}, 400

    if '..' in filepath or '..' in filename:
        return {'error': 'Invalid file path'}, 400

    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    try:
        file = os.path.join(filepath, filename)
        delete_file(os.path.join("files", "web", "uploads", session_id, file))
    except Exception as e:
        return {'error': f'Error deleting file {filename}: {str(e)}'}, 500
    finally:
        safe_remove_active(session_id)

    return {'message': 'File deleted successfully!'}


@app.route('/encrypt-files', methods=['POST'])
@require_session_cookie
def encrypt_files(session_id):
    password = request.form.get('password')
    encrypt_names = request.form.get('encryptNames')

    if not password or encrypt_names is None:
        return {'error': 'Missing encrypt names or password'}, 400

    if encrypt_names == "true":
        encrypt_names_bool = True
    elif encrypt_names == "false":
        encrypt_names_bool = False
    else:
        return {'error': 'Invalid encryptNames state'}, 400

    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    clear_output_directory(session_id)

    try:
        emit_progress(session_id, 'operation_started', {"operation": "encrypt"})

        encrypted_files, total_files = encrypt_directory(
            password,
            1,
            encrypt_names_bool,
            sessionID=session_id,
            progress_callback=lambda pct, info, cur, tot: emit_progress(
                session_id, 'encrypt_progress', {"percent": pct, "info": info, "current": cur, "total": tot}
            )
        )
    except PermissionError as e:
        emit_progress(session_id, 'operation_error', {"error": "Permission denied accessing files"})
        return {'error': 'Permission denied accessing files'}, 500
    except OSError as e:
        if e.errno == 28:
            emit_progress(session_id, 'operation_error', {"error": "Insufficient disk space"})
            return {'error': 'Insufficient disk space'}, 507
        emit_progress(session_id, 'operation_error', {"error": f"File system error: {str(e)}"})
        return {'error': f'File system error: {str(e)}'}, 500
    except MemoryError:
        emit_progress(session_id, 'operation_error', {"error": "Insufficient memory for encryption"})
        return {'error': 'Insufficient memory for encryption'}, 507
    except ValueError as e:
        emit_progress(session_id, 'operation_error', {"error": f"Invalid encryption parameters: {str(e)}"})
        return {'error': f'Invalid encryption parameters: {str(e)}'}, 400
    except Exception as e:
        emit_progress(session_id, 'operation_error', {"error": f"Encryption failed: {str(e)}"})
        return {'error': f'Error encrypting files: {str(e)}'}, 500
    finally:
        safe_remove_active(session_id)

    if encrypted_files is None or encrypted_files == 0:
        emit_progress(session_id, 'operation_error', {"error": "No files were encrypted"})
        return {'error': 'No files found to encrypt'}, 400
    elif encrypted_files == 1:
        emit_progress(session_id, 'operation_finished', {'operation': 'encrypt', "processed": encrypted_files, "total": total_files})
        return {'message': '1 File encrypted successfully!'}
    else:
        emit_progress(session_id, 'operation_finished', {'operation': 'encrypt', "processed": encrypted_files, "total": total_files})
        return {'message': f'{encrypted_files} files encrypted successfully!'}


@app.route('/decrypt-files', methods=['POST'])
@require_session_cookie
def decrypt_files(session_id):
    password = request.form.get('password')

    if not password:
        return {'error': 'Missing password'}, 400

    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    clear_output_directory(session_id)

    total_files = 0
    decrypted_files = 0
    try:
        emit_progress(session_id, 'operation_started', {'operation': 'decrypt'})

        result = decrypt_directory(password, 1, session_id,
                                   progress_callback=lambda pct, info, cur, tot: emit_progress(
                                       session_id, 'decrypt_progress',
                                       {"percent": pct, "info": info, "current": cur, "total": tot}
                                   ))

        if result is None:
            emit_progress(session_id, 'operation_error', {"error": "No files found to decrypt!"})
            clear_output_directory(session_id)
            return {'error': 'No files found to decrypt!'}, 400

        total_files, total_encrypted_files, decrypted_files, password_errors = result

        if decrypted_files == 0:
            clear_output_directory(session_id)

            if total_encrypted_files == 0 or total_encrypted_files != total_files:
                emit_progress(session_id, 'operation_error', {"error": "No encrypted files found!"})
                return {'error': 'No encrypted files found'}, 400
            if password_errors == total_encrypted_files:
                emit_progress(session_id, 'operation_error', {"error": "No files with that password could be found!"})
                return {'error': 'Incorrect password for all encrypted files'}, 401
            emit_progress(session_id, 'operation_error', {"error": "No files could be decrypted!"})
            return {'error': 'No files could be decrypted!'}, 400

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
    except PermissionError:
        clear_output_directory(session_id)
        emit_progress(session_id, 'operation_error', {"error": "Permission denied accessing files"})
        return {'error': 'Permission denied accessing files'}, 500
    except OSError as e:
        clear_output_directory(session_id)
        if e.errno == 28:
            emit_progress(session_id, 'operation_error', {"error": "Insufficient disk space"})
            return {'error': 'Insufficient disk space'}, 507
        emit_progress(session_id, 'operation_error', {"error": f"File system error: {str(e)}"})
        return {'error': f'File system error: {str(e)}'}, 500
    except MemoryError:
        clear_output_directory(session_id)
        emit_progress(session_id, 'operation_error', {"error": "Insufficient memory for decryption"})
        return {'error': 'Insufficient memory for decryption'}, 507
    except ValueError as e:
        clear_output_directory(session_id)
        emit_progress(session_id, 'operation_error', {"error": f"Invalid decryption data: {str(e)}"})
        return {'error': f'Invalid decryption data: {str(e)}'}, 400
    except Exception as e:
        clear_output_directory(session_id)
        emit_progress(session_id, 'operation_error', {"error": f"Decryption failed: {str(e)}"})
        return {'error': f'Error decrypting file: {str(e)}'}, 500
    finally:
        safe_remove_active(session_id)
        emit_progress(session_id, 'operation_finished', {'operation': 'decrypt', "processed": decrypted_files, "total": total_files})


@app.route("/files", methods=['POST'])
@require_session_cookie
def files(session_id):
    output_dir = os.path.join("files", "web", "output", session_id)
    upload_dir = os.path.join("files", "web", "uploads", session_id)
    if not upload_dir or not os.path.exists(output_dir):
        return jsonify({"files": []})

    file_list = []
    for root, dirs, output_files in os.walk(output_dir):
        for f in output_files:
            rel_path = os.path.relpath(os.path.join(root, f), output_dir)
            file_list.append(rel_path)

    return jsonify({"files": file_list})


@app.route("/download-file", methods=['POST'])
@require_session_cookie
def download_file(session_id):
    file_path = request.form.get('filePath')

    if not file_path:
        return {'error': 'Missing file path'}, 400

    if '..' in file_path:
        return {'error': 'Invalid file path'}, 400

    full_file_path = str(os.path.join(BASE_DIR, 'files', 'web', 'output', session_id, file_path))

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
@require_session_cookie
def download_folder(session_id):
    folder_name = request.form.get('folderName')
    if not folder_name:
        return {'error': 'Missing folder name'}, 400

    if '..' in folder_name:
        return {'error': 'Invalid folder name'}, 400

    folder = os.path.join("files", "web", "output", session_id, folder_name)
    zip_buffer = io.BytesIO()

    if not os.path.exists(folder):
        return {'error': f'Session not found'}, 404
    try:
        total_files = 0
        for root, dirs, dir_files in os.walk(folder):
            total_files += len(dir_files)

        if total_files > 0:
            emit_progress(session_id, 'operation_started', {"operation": "download"})

        processed_files = 0
        with zipfile.ZipFile(zip_buffer, "w") as zipf:
            for root, dirs, dir_files in os.walk(folder):
                for file in dir_files:
                    file_path = os.path.join(root, file)
                    archive_name = os.path.relpath(file_path, folder)

                    if total_files > 0:
                        progress_percent = int((processed_files / total_files) * 100)
                        emit_progress(session_id, 'download_progress', {
                            "percent": progress_percent,
                            "info": f"Adding {file} to archive",
                            "current": processed_files + 1,
                            "total": total_files
                        })

                    zipf.write(file_path, archive_name)
                    processed_files += 1

        if total_files > 0:
            emit_progress(session_id, 'operation_finished', {
                'operation': 'download',
                "processed": processed_files,
                "total": total_files
            })

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f"{folder_name}.zip",
            mimetype="application/zip"
        )
    except Exception as e:
        emit_progress(session_id, 'operation_error', {"error": f'Error downloading folder: {str(e)}'})
        return {'error': f'Error downloading folder: {str(e)}'}, 500


@app.route("/download-all", methods=['POST'])
@require_session_cookie
def download_all(session_id):
    folder = os.path.join("files", "web", "output", session_id)
    zip_buffer = io.BytesIO()

    if not os.path.exists(folder):
        return {'error': f'Session not found'}, 404
    try:
        total_files = 0
        for root, dirs, dir_files in os.walk(folder):
            total_files += len(dir_files)

        if total_files > 0:
            emit_progress(session_id, 'operation_started', {"operation": "download"})

        processed_files = 0
        with zipfile.ZipFile(zip_buffer, "w") as zipf:
            for root, dirs, dir_files in os.walk(folder):
                for file in dir_files:
                    file_path = os.path.join(root, file)
                    archive_name = os.path.relpath(file_path, folder)

                    if total_files > 0:
                        progress_percent = int((processed_files / total_files) * 100)
                        emit_progress(session_id, 'download_progress', {
                            "percent": progress_percent,
                            "info": f"Adding {file} to archive",
                            "current": processed_files + 1,
                            "total": total_files
                        })

                    zipf.write(file_path, archive_name)
                    processed_files += 1

        if total_files > 0:
            emit_progress(session_id, 'operation_finished', {
                'operation': 'download',
                "processed": processed_files,
                "total": total_files
            })

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f"{session_id}.zip",
            mimetype="application/zip"
        )
    except Exception as e:
        emit_progress(session_id, 'operation_error', {"error": f'Error downloading folder: {str(e)}'})
        return {'error': f'Error downloading folder: {str(e)}'}, 500


@app.route("/remove-session", methods=['POST'])
@require_session_cookie
def remove_session(session_id):
    if not safe_add_active(session_id):
        return {'error': 'Session is busy with another operation'}, 400

    try:
        upload_dir = os.path.join("files", "web", "uploads", session_id)
        output_dir = os.path.join("files", "web", "output", session_id)
        if os.path.exists(upload_dir):
            shutil.rmtree(upload_dir)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        delete_old_upload_dirs()
        return jsonify({"message": "Session removed successfully!"})
    finally:
        safe_remove_active(session_id)


def run_flask():
    socketio.run(app, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    run_flask()
