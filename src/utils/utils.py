import os
import shutil
import time

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


def derive_key(password: bytes, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA3_512(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(password)


def create_upload_directory(sessionID: str):
    upload_dir = os.path.join('files/web/uploads/' + sessionID)
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

def clear_output_directory(sessionID: str):
    if os.path.exists("files/web/output/" + sessionID):
        output_dir = os.path.join('files/web/output/' + sessionID)
        shutil.rmtree(output_dir)

def delete_old_upload_dirs():
    now = int(time.time())
    dirs = os.listdir('files/web/uploads')
    for upload_dir in dirs:
        dir_path = os.path.join('files/web/uploads', upload_dir)
        if os.path.isdir(dir_path):
            if (now - os.path.getmtime(dir_path)) > 86400:
                shutil.rmtree(dir_path)
    dirs = os.listdir('files/web/output')
    for upload_dir in dirs:
        dir_path = os.path.join('files/web/output', upload_dir)
        if os.path.isdir(dir_path):
            if (now - os.path.getmtime(dir_path)) > 86400:
                shutil.rmtree(dir_path)


def save_file_with_structure(file, upload_dir):
    relative_path = file.filename

    dir_path = os.path.dirname(relative_path)

    if dir_path and dir_path != '.':
        full_dir_path = os.path.join(upload_dir, dir_path)
        os.makedirs(full_dir_path, exist_ok=True)

    file_path = os.path.join(upload_dir, relative_path)
    file.save(file_path)

    return file_path


def delete_file(file_path):
    os.remove(file_path)