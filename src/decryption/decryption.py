import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def decrypt_file(password: str, filename: str):
    if not os.path.exists("encrypted/" + filename + ".dat"):
        print(f"File '{filename}.dat' not found.")
        return
    with open("encrypted/" + filename + ".dat", "rb") as f:
        data = f.read()

    salt = data[:16]
    iv = data[16:32]
    ciphertext = data[32:]
    key = derive_key(password.encode(), salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    decrypted_data = unpadder.update(padded_plain_data) + unpadder.finalize()

    os.makedirs("files/decrypted", exist_ok=True)
    with open("decrypted/" + filename, "wb") as f:
        f.write(decrypted_data)
    print(f"File decrypted and saved to 'decrypted/{filename}'.\n")


def decrypt_directory(password: str):
    if not os.path.exists("encrypted/" + filename + ".dat"):
        print(f"File '{filename}.dat' not found.")
        return
    with open("encrypted/" + filename + ".dat", "rb") as f:
        data = f.read()

    salt = data[:16]
    iv = data[16:32]
    ciphertext = data[32:]
    key = derive_key(password.encode(), salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    decrypted_data = unpadder.update(padded_plain_data) + unpadder.finalize()

    os.makedirs("files/decrypted", exist_ok=True)
    with open("decrypted/" + filename, "wb") as f:
        f.write(decrypted_data)
    print(f"File decrypted and saved to 'decrypted/{filename}'.\n")