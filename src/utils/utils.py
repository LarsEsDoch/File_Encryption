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


def create_upload_directory():
    upload_dir = os.path.join('files/web/uploads', str(int(time.time() * 1000)))
    delete_old_upload_directory()
    os.makedirs(upload_dir, exist_ok=True)
    print(f"Upload directory created: {upload_dir}")
    return upload_dir


def delete_old_upload_directory():
    upload_dir = 'files/web/uploads'
    if count_uploads(upload_dir) > 5:
        cleanup_old_uploads()


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
    print(f"Deleted file: {file_path}")


def count_uploads(path):
    if not os.path.exists(path):
        return 0
    print(path)
    count = 0
    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        if os.path.isdir(item_path):
            count += 1
    return count


def get_upload_directories():
    upload_base = 'files/web/uploads'
    if not os.path.exists(upload_base):
        return []
    return sorted(
        [os.path.join(upload_base, d) for d in os.listdir(upload_base)],
        key=os.path.getmtime,
        reverse=True
    )


def cleanup_old_uploads():
    dirs = get_upload_directories()
    while len(dirs) > 5:
        oldest_dir = dirs.pop()
        shutil.rmtree(oldest_dir)
        print(f"Deleted old upload directory: {oldest_dir}")