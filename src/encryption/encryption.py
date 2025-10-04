import os
import shutil

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils import utils
from src.utils.utils import derive_key


def encrypt_file(password: str, filename: str, encrypt_name: bool = False):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()

    input_path = os.path.join("files", "input", filename)
    if not os.path.exists(input_path):
        print(f"File '{filename}' not found.\n")
        return

    with open(input_path, "rb") as f:
        data = f.read()

    if encrypt_name:
        filename_bytes = filename.encode("utf-8")
        payload = len(filename_bytes).to_bytes(2, "big") + filename_bytes + data
    else:
        payload = data

    padded = padder.update(payload) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    os.makedirs("files/encrypted", exist_ok=True)

    if encrypt_name:
        timestamp_name = utils.format_timestamp_from_path(input_path)
        out_path = utils.get_unique_output_path("files/encrypted", timestamp_name, ".dat")
    else:
        out_path = os.path.join("files", "encrypted", filename) + ".dat"

    with open(out_path, "wb") as f:
        f.write(salt + iv + ciphertext)

    print(f"File encrypted and saved to '{out_path}'.\n")


def encrypt_directory(password: str, mode: int, encrypt_name: bool = False, sessionID: str = None, progress_callback=None):
    if mode == 0:
        if not os.path.exists("files/input/"):
            print("'files/input/' not found.\n")
            return None
        shutil.rmtree(os.path.join("files", "encrypted"), ignore_errors=True)
        os.makedirs("files/encrypted", exist_ok=True)
        root_in = os.path.join("files", "input")
        root_out = os.path.join("files", "encrypted")
    elif mode == 1:
        upload_dir = os.path.join("files", "web", "uploads", sessionID)
        if not os.path.exists(upload_dir):
            return None
        output_dir = os.path.join("files", "web", "output", sessionID)
        os.makedirs(output_dir, exist_ok=True)
        root_in = upload_dir
        root_out = output_dir
    else:
        return None

    total_files = sum(
        len([f for f in files if os.path.isfile(os.path.join(root, f))])
        for root, dirs, files in os.walk(root_in)
    )
    if total_files == 0:
        print("No files found to encrypt.\n")
        return 0

    encrypted_files = 0

    def encrypt_in_directory(input_dir: str, output_dir: str):
        nonlocal encrypted_files

        for item in os.listdir(input_dir):
            input_path = os.path.join(input_dir, item)

            if os.path.isfile(input_path):
                salt = os.urandom(16)
                iv = os.urandom(16)
                key = derive_key(password.encode(), salt)

                with open(input_path, "rb") as f:
                    data = f.read()

                if encrypt_name:
                    filename_bytes = item.encode("utf-8")
                    payload = len(filename_bytes).to_bytes(2, "big") + filename_bytes + data
                else:
                    payload = data

                padder = padding.PKCS7(128).padder()
                padded = padder.update(payload) + padder.finalize()

                cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                encryptor = cipher.encryptor()
                ciphertext = encryptor.update(padded) + encryptor.finalize()

                if encrypt_name:
                    timestamp_name = utils.format_timestamp_from_path(input_path)
                    out_path = utils.get_unique_output_path(output_dir, timestamp_name, ".dat")
                else:
                    out_path = os.path.join(output_dir, item) + ".dat"

                os.makedirs(output_dir, exist_ok=True)
                with open(out_path, "wb") as f:
                    f.write(salt + iv + ciphertext)

                encrypted_files += 1

                if progress_callback:
                    percent = int((encrypted_files / total_files) * 100)
                    progress_callback(percent, f"Encrypted {item}", encrypted_files, total_files)

            elif os.path.isdir(input_path):
                sub_out = os.path.join(output_dir, item)
                os.makedirs(sub_out, exist_ok=True)
                encrypt_in_directory(input_path, sub_out)

    encrypt_in_directory(root_in, root_out)

    if mode == 0:
        if encrypted_files == 0:
            print("No files encrypted.\n")
        elif encrypted_files == 1:
            print(f"{encrypted_files} file encrypted and saved to '{root_out}'.\n")
        else:
            print(f"{encrypted_files} files encrypted and saved to '{root_out}'.\n")
    elif mode == 1:
        return encrypted_files, total_files

    return None