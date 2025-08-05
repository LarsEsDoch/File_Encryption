import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def encrypt_file(password: str, filename: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()

    if not os.path.exists(f"files/input/{filename}"):
        print(f"File '{filename}' not found.\n")
        return
    with open(f"files/input/{filename}", "rb") as f:
        data = f.read()

    padded = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    os.makedirs("files/encrypted", exist_ok=True)
    with open(f"files/encrypted/{filename}.dat", "wb") as f:
        f.write(salt + iv + ciphertext)
    print(f"File encrypted and saved to 'files/encrypted/{filename}.dat'.\n")

def encrypt_directory(password: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    if not os.path.exists("files/input/"):
        print("'files/input/' not found.\n")
        return

    os.makedirs("files/encrypted", exist_ok=True)
    encrypted_files = 0

    def encrypt_in_directory(input_dir: str, output_dir: str):
        nonlocal encrypted_files

        for item in os.listdir(input_dir):
            input_path = os.path.join(input_dir, item)
            output_path = os.path.join(output_dir, item)

            if os.path.isfile(input_path):
                with open(input_path, "rb") as f:
                    data = f.read()

                padder = padding.PKCS7(128).padder()
                padded = padder.update(data) + padder.finalize()

                cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                encryptor = cipher.encryptor()
                ciphertext = encryptor.update(padded) + encryptor.finalize()

                with open(output_path + ".dat", "wb") as f:
                    f.write(salt + iv + ciphertext)

                encrypted_files += 1

            elif os.path.isdir(input_path):
                os.makedirs(output_path, exist_ok=True)
                encrypt_in_directory(input_path, output_path)

    encrypt_in_directory("files/input", "files/encrypted")

    if encrypted_files == 0:
        print("No files encrypted.\n")
    elif encrypted_files == 1:
        print(f"{encrypted_files} file encrypted and saved to 'files/encrypted/'.\n")
    else:
        print(f"{encrypted_files} files encrypted and saved to 'files/encrypted/'.\n")