import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def encrypt_file(password: str, filename: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()
    print(os.getcwd())
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
        print(f"'files/input/' not found.\n")
        return
    if not any(os.path.isfile(os.path.join("files/input", f)) for f in os.listdir("files/input")):
        print("No files found in 'files/input/' to encrypt.\n")
        return

    os.makedirs("files/encrypted", exist_ok=True)
    encrypted_files = 0

    for filename in os.listdir("files/input/"):
        if os.path.isfile(f"files/input/{filename}"):
            with open(f"files/input/{filename}", "rb") as f:
                data = f.read()

            padder = padding.PKCS7(128).padder()

            padded = padder.update(data) + padder.finalize()

            cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(padded) + encryptor.finalize()

            with open(f"files/encrypted/{filename}.dat", "wb") as f:
                f.write(salt + iv + ciphertext)
            encrypted_files += 1
        elif os.path.isdir(f"files/input/{filename}"):
            if not any(os.path.isfile(os.path.join("files/input", f)) for f in os.listdir("files/input")):
                continue
            os.makedirs(f"files/encrypted/{filename}", exist_ok=True)
            for filename_sub in os.listdir(f"files/input/{filename}"):
                if os.path.isfile(f"files/input/{filename}/{filename_sub}"):
                    with open(f"files/input/{filename}/{filename_sub}", "rb") as f:
                        data = f.read()

                    padder = padding.PKCS7(128).padder()

                    padded = padder.update(data) + padder.finalize()

                    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                    encryptor = cipher.encryptor()
                    ciphertext = encryptor.update(padded) + encryptor.finalize()

                    with open(f"files/encrypted/{filename}/{filename_sub}.dat", "wb") as f:
                        f.write(salt + iv + ciphertext)
                    encrypted_files += 1

    if encrypted_files == 0:
        print("No files decrypted.\n")
    elif encrypted_files == 1:
        print(f"{encrypted_files} file decrypted and saved to 'files/decrypted/'.\n")
    else:
        print(f"{encrypted_files} files decrypted and saved to 'files/decrypted/'.\n")