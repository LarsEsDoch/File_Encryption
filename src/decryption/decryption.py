import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils.utils import derive_key


def decrypt_file(password: str, filename: str):
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


def decrypt_directory(password: str):
    if not os.path.exists("files/encrypted/"):
        print(f"'files/encrypted/' not found.\n")
        return
    if not any(os.path.isfile(os.path.join("files/encrypted", f)) for f in os.listdir("files/encrypted")):
        print("No files found in 'files/encrypted/' to decrypt.\n")
        return

    os.makedirs("files/encrypted", exist_ok=True)
    decrypted_files = 0

    for filename in os.listdir("files/encrypted/"):
        if os.path.isfile("files/encrypted/" + filename):
            with open("files/encrypted/" + filename, "rb") as f:
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
                print(f"Wrong password '{filename}'.\n")
                continue

            with open(f"files/decrypted/{os.path.splitext(filename)[0]}", "wb") as f:
                f.write(decrypted_data)
            decrypted_files += 1
        elif os.path.isdir(f"files/encrypted/{filename}"):
            if not any(os.path.isfile(os.path.join("files/encrypted", f)) for f in os.listdir("files/encrypted")):
                continue
            os.makedirs(f"files/decrypted/{filename}", exist_ok=True)
            for filename_sub in os.listdir(f"files/encrypted/{filename}"):
                if os.path.isfile(f"files/encrypted/{filename}/{filename_sub}"):
                    with open(f"files/encrypted/{filename}/{filename_sub}", "rb") as f:
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
                        print(f"Wrong password '{filename}'.\n")
                        continue

                    with open(f"files/decrypted/{filename}/{os.path.splitext(filename_sub)[0]}", "wb") as f:
                        f.write(decrypted_data)
                    decrypted_files += 1

    if decrypted_files == 0:
        print("No files decrypted.\n")
    elif decrypted_files == 1:
        print(f"{decrypted_files} file decrypted and saved to 'files/decrypted/'.\n")
    else:
        print(f"{decrypted_files} files decrypted and saved to 'files/decrypted/'.\n")