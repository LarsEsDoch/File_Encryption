import os
import shutil
from typing import Optional, Tuple, Callable

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils import utils
from src.utils.utils import derive_key


class DecryptionError(Exception):
    pass


class FileCorruptionError(DecryptionError):
    pass


class InvalidPasswordError(DecryptionError):
    pass


def _safe_progress_callback(callback: Optional[Callable], *args):
    if callback:
        try:
            callback(*args)
        except Exception:
            pass


def _validate_encrypted_file_structure(data: bytes) -> Tuple[bytes, bytes, bytes]:
    if len(data) < 32:
        raise FileCorruptionError("Encrypted file is too short or corrupted")

    salt, iv, ciphertext = data[:16], data[16:32], data[32:]

    if len(ciphertext) == 0:
        raise FileCorruptionError("No encrypted data found")

    if len(ciphertext) % 16 != 0:
        raise FileCorruptionError("Invalid ciphertext length (not aligned to block size)")

    return salt, iv, ciphertext


def decrypt_file(password: str, encrypted_filename: str):
    if not password:
        raise ValueError("Password cannot be empty")

    if not encrypted_filename:
        raise ValueError("Filename cannot be empty")

    enc_path = os.path.join("files", "encrypted", f"{encrypted_filename}.dat")
    if not os.path.exists(enc_path):
        raise FileNotFoundError(f"File '{encrypted_filename}.dat' not found")

    try:
        with open(enc_path, "rb") as f:
            data = f.read()

        salt, iv, ciphertext = _validate_encrypted_file_structure(data)

        key = derive_key(password.encode(), salt)
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
        decryptor = cipher.decryptor()

        try:
            padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()
        except Exception as e:
            raise FileCorruptionError(f"Decryption failed - file may be corrupted: {str(e)}")

        unpadder = padding.PKCS7(128).unpadder()
        try:
            decrypted_payload = unpadder.update(padded_plain_data) + unpadder.finalize()
        except ValueError:
            raise InvalidPasswordError("Decryption failed - incorrect password")

        name_from_payload, file_data = utils.extract_name_and_data_from_payload(decrypted_payload)

        if name_from_payload:
            original_name = name_from_payload
        else:
            original_name = encrypted_filename
            file_data = decrypted_payload

        os.makedirs("files/decrypted", exist_ok=True)

        out_path = os.path.join("files", "decrypted", original_name)
        base, ext = os.path.splitext(out_path)
        counter = 1
        while os.path.exists(out_path):
            out_path = f"{base}_{counter}{ext}"
            counter += 1

        temp_path = out_path + ".tmp"
        try:
            with open(temp_path, "wb") as f:
                f.write(file_data)

            if os.path.getsize(temp_path) != len(file_data):
                raise FileCorruptionError("Output file size mismatch")

            os.rename(temp_path, out_path)

        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

        print(f"File decrypted and saved to '{out_path}'.\n")

    except (OSError, IOError) as e:
        if e.errno in [13, 1]:
            raise PermissionError("Permission denied accessing file") from e
        elif e.errno == 28:
            raise OSError("Insufficient disk space") from e
        else:
            raise DecryptionError(f"File system error: {str(e)}") from e
    except MemoryError as e:
        raise DecryptionError("Insufficient memory for decryption") from e


def decrypt_directory(password: str, mode: int, sessionID: str = None, progress_callback=None):
    if not password:
        raise ValueError("Password cannot be empty")

    if mode == 0:
        if not os.path.exists("files/encrypted/"):
            raise FileNotFoundError("'files/encrypted/' not found")
        shutil.rmtree("files/decrypted", ignore_errors=True)
        os.makedirs("files/decrypted", exist_ok=True)
        root_in = os.path.join("files", "encrypted")
        root_out = os.path.join("files", "decrypted")
    elif mode == 1:
        if not sessionID:
            raise ValueError("Session ID required for web mode")
        upload_dir = os.path.join("files", "web", "uploads", sessionID)
        if not os.path.exists(upload_dir):
            raise FileNotFoundError(f"Upload directory not found for session {sessionID}")
        os.makedirs(os.path.join("files", "web", "output", sessionID), exist_ok=True)
        root_in = upload_dir
        root_out = os.path.join("files", "web", "output", sessionID)
    else:
        raise ValueError(f"Invalid mode: {mode}")

    total_files_socket = sum(
        len([f for f in files if os.path.isfile(os.path.join(root, f))])
        for root, dirs, files in os.walk(root_in)
    )
    if total_files_socket == 0:
        if mode == 0:
            print("No files found to decrypt.\n")
        return None

    total_files = 0
    total_encrypted_files = 0
    decrypted_files = 0
    password_errors = 0
    corruption_errors = 0
    other_errors = []

    def decrypt_in_directory(encrypted_dir: str, decrypted_dir: str):
        nonlocal total_files, total_encrypted_files, decrypted_files, password_errors, corruption_errors, other_errors

        os.makedirs(decrypted_dir, exist_ok=True)

        try:
            items = os.listdir(encrypted_dir)
        except PermissionError:
            other_errors.append(f"Permission denied: {encrypted_dir}")
            return

        for item in items:
            encrypted_path = os.path.join(encrypted_dir, item)

            if os.path.isfile(encrypted_path):
                total_files += 1

                if not item.lower().endswith('.dat'):
                    continue

                total_encrypted_files += 1

                try:
                    if not os.access(encrypted_path, os.R_OK):
                        other_errors.append(f"No read permission: {item}")
                        continue

                    try:
                        with open(encrypted_path, "rb") as f:
                            data = f.read()
                    except MemoryError:
                        other_errors.append(f"File too large: {item}")
                        continue
                    except (OSError, IOError) as e:
                        other_errors.append(f"Read error {item}: {str(e)}")
                        continue

                    try:
                        salt, iv, ciphertext = _validate_encrypted_file_structure(data)
                    except FileCorruptionError:
                        corruption_errors += 1
                        if mode == 0:
                            print(f"Skipping corrupted file: {item}")
                        continue

                    key = derive_key(password.encode(), salt)
                    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
                    decryptor = cipher.decryptor()

                    try:
                        padded_plain_data = decryptor.update(ciphertext) + decryptor.finalize()
                    except Exception:
                        corruption_errors += 1
                        if mode == 0:
                            print(f"Decryption failed for corrupted file: {item}")
                        continue

                    unpadder = padding.PKCS7(128).unpadder()
                    try:
                        decrypted_payload = unpadder.update(padded_plain_data) + unpadder.finalize()
                    except ValueError:
                        password_errors += 1
                        continue

                    try:
                        name_from_payload, file_data = utils.extract_name_and_data_from_payload(decrypted_payload)
                    except Exception as e:
                        corruption_errors += 1
                        if mode == 0:
                            print(f"Failed to extract data from {item}: {str(e)}")
                        continue

                    if name_from_payload:
                        original_name = name_from_payload
                    else:
                        original_name = os.path.splitext(item)[0]
                        file_data = decrypted_payload

                    out_file_path = os.path.join(decrypted_dir, original_name)
                    base, ext = os.path.splitext(out_file_path)
                    counter = 1
                    while os.path.exists(out_file_path):
                        out_file_path = f"{base}_{counter}{ext}"
                        counter += 1

                    temp_path = out_file_path + ".tmp"
                    try:
                        with open(temp_path, "wb") as f:
                            f.write(file_data)

                        if os.path.getsize(temp_path) != len(file_data):
                            raise FileCorruptionError("Output file size mismatch")

                        os.rename(temp_path, out_file_path)
                        decrypted_files += 1

                        _safe_progress_callback(
                            progress_callback,
                            int((decrypted_files / total_files_socket) * 100),
                            f"Decrypted {item}",
                            decrypted_files,
                            total_files_socket
                        )

                    except Exception as e:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                        other_errors.append(f"Write error {item}: {str(e)}")

                except Exception as e:
                    if mode == 0:
                        print(f"Error decrypting {item}: {str(e)}")
                    elif mode == 1:
                        other_errors.append(f"Error decrypting {item}: {str(e)}")

            elif os.path.isdir(encrypted_path):
                sub_decrypted = os.path.join(decrypted_dir, item)
                os.makedirs(sub_decrypted, exist_ok=True)
                decrypt_in_directory(encrypted_path, sub_decrypted)

    decrypt_in_directory(root_in, root_out)

    if mode == 0:
        if corruption_errors > 0:
            print(f"Warning: {corruption_errors} files were corrupted and skipped")
        if other_errors:
            print(f"Warning: {len(other_errors)} files had errors:")
            for error in other_errors[:5]:
                print(f"  - {error}")
            if len(other_errors) > 5:
                print(f"  ... and {len(other_errors) - 5} more")

        if decrypted_files == 0:
            print("No files decrypted.\n")
        elif decrypted_files == 1:
            print(f"{decrypted_files} file decrypted and saved to '{root_out}'.\n")
        else:
            print(f"{decrypted_files} files decrypted and saved to '{root_out}'.\n")
        return None
    elif mode == 1:
        return (total_files, total_encrypted_files, decrypted_files, password_errors)
    return None