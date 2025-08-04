import os
import sys

from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def derive_key(password: bytes, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA3_512(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(password)


def encrypt_and_save(password: str, filename: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()
    with open(filename, "rb") as f:
        data = f.read()

    padded = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    os.makedirs("encrypted", exist_ok=True)
    with open("encrypted/" + filename + ".dat", "wb") as f:
        f.write(salt + iv + ciphertext)
    print(f"File encrypted and saved to 'encrypted/{filename}.dat'.\n")


def load_and_decrypt(password: str, filename: str):
    if not os.path.exists("encrypted/" + filename + ".dat"):
        print(f"File '{filename + '.dat'}' not found.")
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

    os.makedirs("decrypted", exist_ok=True)
    with open("decrypted/" + filename, "wb") as f:
        f.write(decrypted_data)
    print(f"File decrypted and saved to 'decrypted/{filename}'.\n")


def run():
    while True:
        print("Modes:")
        print("1. Encrypt")
        print("2. Decrypt")
        print("3. Exit")
        mode = input("Enter mode: ")
        if mode == "1":
            filename = input("Enter filename: ")
            password = input("Password: ")
            encrypt_and_save(password, filename)
        elif mode == "2":
            filename = input("Enter filename: ")
            password = input("Password: ")
            load_and_decrypt(password, filename)
        elif mode == "3":
            sys.exit(0)
        else:
            print("Invalid mode. Please try again.")


if __name__ == "__main__":
    print("\n--- Welcome to the File Encryption Tool! ---\n")
    run()
    print("\n--- Thanks for using the File Encryption Tool! ---\n")