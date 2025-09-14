import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils import utils
from src.utils.utils import derive_key


def decrypt_file(password: str, encrypted_filename: str, encrypt_name: bool = False):
    enc_path = os.path.join("files", "encrypted", f"{encrypted_filename}.dat")
    if not os.path.exists(enc_path):
        print(f"File '{encrypted_filename}.dat' not found.")
        return

    with open(enc_path, "rb") as f:
        data = f.read()

    if len(data) < 32:
        print("Encrypted file is too short or corrupted.")
        return

    salt = data[:16]
    iv = data[16:32]
    ciphertext = data[32:]
    key = derive_key(password.encode(), salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    try:
        decrypted_payload = unpadder.update(padded_plain_data) + unpadder.finalize()
    except ValueError:
        print("Decryption failed — wrong password or corrupted file.")
        return

    name_from_payload, file_data = utils.extract_name_and_data_from_payload(decrypted_payload)

    if name_from_payload:
        original_name = name_from_payload
    elif encrypt_name:
        try:
            name_part, file_data2 = decrypted_payload.split(b"\n", 1)
            original_name = name_part.decode("utf-8", errors="replace")
            file_data = file_data2
        except Exception:
            original_name = os.path.splitext(encrypted_filename)[0]
            file_data = decrypted_payload
    else:
        original_name = os.path.splitext(encrypted_filename)[0]
        file_data = decrypted_payload

    os.makedirs(os.path.join("files", "decrypted"), exist_ok=True)

    out_path = os.path.join("files", "decrypted", original_name)
    counter = 1
    base, ext = os.path.splitext(out_path)
    while os.path.exists(out_path):
        out_path = f"{base}_{counter}{ext}"
        counter += 1

    with open(out_path, "wb") as f:
        f.write(file_data)

    print(f"File decrypted and saved to '{out_path}'.\n")


def decrypt_directory(password: str, mode: int, encrypt_name: bool = False, sessionID: str = None):
    if mode == 0:
        if not os.path.exists("files/encrypted/"):
            print("'files/encrypted/' not found.\n")
            return None
        os.makedirs("files/decrypted", exist_ok=True)
        root_in = os.path.join("files", "encrypted")
        root_out = os.path.join("files", "decrypted")
    elif mode == 1:
        if not os.path.exists(os.path.join("files", "web", "uploads", sessionID)):
            return None
        os.makedirs(os.path.join("files", "web", "output", sessionID), exist_ok=True)
        root_in = os.path.join("files", "web", "uploads", sessionID)
        root_out = os.path.join("files", "web", "output", sessionID)
    else:
        return None

    total_files = 0
    total_encrypted_files = 0
    decrypted_files = 0
    password_errors = 0

    def decrypt_in_directory(encrypted_dir: str, decrypted_dir: str):
        nonlocal total_files, total_encrypted_files, decrypted_files, password_errors

        os.makedirs(decrypted_dir, exist_ok=True)
        for item in os.listdir(encrypted_dir):
            encrypted_path = os.path.join(encrypted_dir, item)

            if os.path.isfile(encrypted_path):
                total_files += 1
                if not item.lower().endswith('.dat'):
                    continue
                total_encrypted_files += 1

                try:
                    with open(encrypted_path, "rb") as f:
                        data = f.read()

                    if len(data) < 32:
                        continue

                    salt = data[:16]
                    iv = data[16:32]
                    ciphertext = data[32:]
                    key = derive_key(password.encode(), salt)

                    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                    decryptor = cipher.decryptor()
                    padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()

                    unpadder = padding.PKCS7(128).unpadder()
                    try:
                        decrypted_payload = unpadder.update(padded_plain_data) + unpadder.finalize()
                    except ValueError:
                        password_errors += 1
                        continue

                    name_from_payload, file_data = utils.extract_name_and_data_from_payload(decrypted_payload)
                    if name_from_payload:
                        original_name = name_from_payload
                    elif encrypt_name:
                        try:
                            name_part, file_data2 = decrypted_payload.split(b"\n", 1)
                            original_name = name_part.decode("utf-8", errors="replace")
                            file_data = file_data2
                        except Exception:
                            original_name = os.path.splitext(item)[0]
                            file_data = decrypted_payload
                    else:
                        original_name = os.path.splitext(item)[0]
                        file_data = decrypted_payload

                    out_file_path = os.path.join(decrypted_dir, original_name)
                    base, ext = os.path.splitext(out_file_path)
                    counter = 1
                    while os.path.exists(out_file_path):
                        out_file_path = f"{base}_{counter}{ext}"
                        counter += 1

                    with open(out_file_path, "wb") as f:
                        f.write(file_data)

                    decrypted_files += 1

                except Exception as e:
                    if mode == 0:
                        print(f"Error decrypting {item}: {str(e)}")
                    elif mode == 1:
                        raise e

            elif os.path.isdir(encrypted_path):
                sub_decrypted = os.path.join(decrypted_dir, item)
                os.makedirs(sub_decrypted, exist_ok=True)
                decrypt_in_directory(encrypted_path, sub_decrypted)

    decrypt_in_directory(root_in, root_out)

    if mode == 0:
        if decrypted_files == 0:
            print("No files decrypted.\n")
        elif decrypted_files == 1:
            print(f"{decrypted_files} file decrypted and saved to '{root_out}'.\n")
        else:
            print(f"{decrypted_files} files decrypted and saved to '{root_out}'.\n")
    elif mode == 1:
        return (total_files, total_encrypted_files, decrypted_files, password_errors)

    return None
