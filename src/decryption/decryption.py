import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def decrypt_file(password: str, filename: str, mode: int):
    if not os.path.exists(f"files/encrypted/{filename}.dat"):
        print(f"File '{filename}.dat' not found.")
        return
    with open("files/encrypted/{filename}.dat", "rb") as f:
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
    with open(f"files/decrypted/{filename}", "wb") as f:
        f.write(decrypted_data)
    print(f"File decrypted and saved to 'files/decrypted/{filename}'.\n")


def decrypt_directory(password: str, mode: int):
    if not os.path.exists("files/encrypted/"):
        print("'files/encrypted/' not found.\n")
        return

    os.makedirs("files/decrypted", exist_ok=True)
    decrypted_files = 0

    def decrypt_in_directory(encrypted_dir: str, decrypted_dir: str):
        nonlocal decrypted_files

        for item in os.listdir(encrypted_dir):
            encrypted_path = os.path.join(encrypted_dir, item)
            decrypted_path = os.path.join(decrypted_dir, os.path.splitext(item)[0])

            if os.path.isfile(encrypted_path):
                with open(encrypted_path, "rb") as f:
                    data = f.read()

                salt = data[:16]
                iv = data[16:32]
                ciphertext = data[32:]
                key = derive_key(password.encode(), salt)

                cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                decryptor = cipher.decryptor()
                padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()

                unpadder = padding.PKCS7(128).unpadder()
                try:
                    decrypted_data = unpadder.update(padded_plain_data) + unpadder.finalize()
                except ValueError:
                    continue

                with open(decrypted_path, "wb") as f:
                    f.write(decrypted_data)

                decrypted_files += 1

            elif os.path.isdir(encrypted_path):
                os.makedirs(decrypted_path, exist_ok=True)
                decrypt_in_directory(encrypted_path, decrypted_path)

    decrypt_in_directory("files/encrypted", "files/decrypted")

    if decrypted_files == 0:
        print("No files decrypted.\n")
    elif decrypted_files == 1:
        print(f"{decrypted_files} file decrypted and saved to 'files/decrypted/'.\n")
    else:
        print(f"{decrypted_files} files decrypted and saved to 'files/decrypted/'.\n")