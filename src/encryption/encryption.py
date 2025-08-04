import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def encrypt_file(password: str, filename: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()
    if not os.path.exists("input/" + filename):
        print(f"File '{filename}' not found.")
        return
    with open("input/" + filename, "rb") as f:
        data = f.read()

    padded = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    os.makedirs("files/encrypted", exist_ok=True)
    with open("encrypted/" + filename + ".dat", "wb") as f:
        f.write(salt + iv + ciphertext)
    print(f"File encrypted and saved to 'encrypted/{filename}.dat'.\n")

def encrypt_directory(password: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()
    if not os.path.exists("input/" + filename):
        print(f"File '{filename}' not found.")
        return
    with open("input/" + filename, "rb") as f:
        data = f.read()

    padded = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    os.makedirs("files/encrypted", exist_ok=True)
    with open("encrypted/" + filename + ".dat", "wb") as f:
        f.write(salt + iv + ciphertext)
    print(f"File encrypted and saved to 'encrypted/{filename}.dat'.\n")