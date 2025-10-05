import os
import shutil
from typing import Optional, Callable

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from src.utils import utils
from src.utils.utils import derive_key


class EncryptionError(Exception):
    pass


class InsufficientSpaceError(EncryptionError):
    pass


class FileCorruptionError(EncryptionError):
    pass


def _safe_progress_callback(callback: Optional[Callable], *args):
    if callback:
        try:
            callback(*args)
        except Exception:
            pass


def _check_disk_space(file_path: str, estimated_size: int):
    try:
        stat = os.statvfs(os.path.dirname(file_path))
        free_space = stat.f_frsize * stat.f_bavail
        if free_space < estimated_size * 1.2:
            raise InsufficientSpaceError("Insufficient disk space")
    except (OSError, AttributeError):
        pass


def encrypt_file(password: str, filename: str, encrypt_name: bool = False):
    if not password:
        raise ValueError("Password cannot be empty")

    if not filename:
        raise ValueError("Filename cannot be empty")

    input_path = os.path.join("files", "input", filename)
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File '{filename}' not found")

    try:
        with open(input_path, "rb") as f:
            data = f.read()

        if len(data) == 0:
            raise FileCorruptionError("Input file is empty")

        estimated_output_size = len(data) + len(filename.encode()) + 64
        os.makedirs("files/encrypted", exist_ok=True)
        _check_disk_space("files/encrypted", estimated_output_size)

        salt = os.urandom(16)
        iv = os.urandom(16)
        key = derive_key(password.encode(), salt)

        if encrypt_name:
            filename_bytes = filename.encode("utf-8")
            if len(filename_bytes) > 65535:
                raise ValueError("Filename too long for encryption")
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
            out_path = utils.get_unique_output_path("files/encrypted", timestamp_name, ".dat")
        else:
            out_path = os.path.join("files", "encrypted", filename) + ".dat"

        temp_path = out_path + ".tmp"
        try:
            with open(temp_path, "wb") as f:
                f.write(salt + iv + ciphertext)

            if os.path.getsize(temp_path) != len(salt + iv + ciphertext):
                raise FileCorruptionError("Output file size mismatch")

            os.rename(temp_path, out_path)

        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

        print(f"File encrypted and saved to '{out_path}'.\n")

    except (OSError, IOError) as e:
        if e.errno == 28:
            raise InsufficientSpaceError("Insufficient disk space") from e
        elif e.errno in [13, 1]:
            raise PermissionError("Permission denied accessing file") from e
        else:
            raise EncryptionError(f"File system error: {str(e)}") from e
    except MemoryError as e:
        raise EncryptionError("Insufficient memory for encryption") from e


def encrypt_directory(password: str, mode: int, encrypt_name: bool = False, sessionID: str = None,
                      progress_callback=None):
    if not password:
        raise ValueError("Password cannot be empty")

    if mode == 0:
        if not os.path.exists("files/input/"):
            raise FileNotFoundError("'files/input/' not found")
        shutil.rmtree(os.path.join("files", "encrypted"), ignore_errors=True)
        os.makedirs("files/encrypted", exist_ok=True)
        root_in = os.path.join("files", "input")
        root_out = os.path.join("files", "encrypted")
    elif mode == 1:
        if not sessionID:
            raise ValueError("Session ID required for web mode")
        upload_dir = os.path.join("files", "web", "uploads", sessionID)
        if not os.path.exists(upload_dir):
            raise FileNotFoundError(f"Upload directory not found for session {sessionID}")
        output_dir = os.path.join("files", "web", "output", sessionID)
        os.makedirs(output_dir, exist_ok=True)
        root_in = upload_dir
        root_out = output_dir
    else:
        raise ValueError(f"Invalid mode: {mode}")

    total_files = sum(
        len([f for f in files if os.path.isfile(os.path.join(root, f))])
        for root, dirs, files in os.walk(root_in)
    )

    if total_files == 0:
        if mode == 0:
            print("No files found to encrypt.\n")
        return 0, 0

    encrypted_files = 0
    failed_files = []

    def encrypt_in_directory(input_dir: str, output_dir: str):
        nonlocal encrypted_files, failed_files

        try:
            items = os.listdir(input_dir)
        except PermissionError:
            failed_files.append(f"Permission denied: {input_dir}")
            return

        for item in items:
            input_path = os.path.join(input_dir, item)

            if os.path.isfile(input_path):
                try:
                    if not os.access(input_path, os.R_OK):
                        failed_files.append(f"No read permission: {item}")
                        continue

                    try:
                        with open(input_path, "rb") as f:
                            data = f.read()
                    except MemoryError:
                        failed_files.append(f"File too large: {item}")
                        continue
                    except (OSError, IOError) as e:
                        failed_files.append(f"Read error {item}: {str(e)}")
                        continue

                    if len(data) == 0:
                        failed_files.append(f"Empty file skipped: {item}")
                        continue

                    salt = os.urandom(16)
                    iv = os.urandom(16)
                    key = derive_key(password.encode(), salt)

                    if encrypt_name:
                        filename_bytes = item.encode("utf-8")
                        if len(filename_bytes) > 65535:
                            failed_files.append(f"Filename too long: {item}")
                            continue
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

                    try:
                        _check_disk_space(output_dir, len(salt + iv + ciphertext))
                    except InsufficientSpaceError:
                        raise

                    temp_path = out_path + ".tmp"
                    try:
                        with open(temp_path, "wb") as f:
                            f.write(salt + iv + ciphertext)

                        if os.path.getsize(temp_path) != len(salt + iv + ciphertext):
                            raise FileCorruptionError("Output file size mismatch")

                        os.rename(temp_path, out_path)
                        encrypted_files += 1

                        _safe_progress_callback(
                            progress_callback,
                            int((encrypted_files / total_files) * 100),
                            f"Encrypted {item}",
                            encrypted_files,
                            total_files
                        )

                    except Exception as e:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                        raise e

                except InsufficientSpaceError:
                    raise
                except MemoryError:
                    failed_files.append(f"Memory error: {item}")
                except (OSError, IOError) as e:
                    failed_files.append(f"IO error {item}: {str(e)}")
                except Exception as e:
                    failed_files.append(f"Encryption error {item}: {str(e)}")

            elif os.path.isdir(input_path):
                sub_out = os.path.join(output_dir, item)
                os.makedirs(sub_out, exist_ok=True)
                encrypt_in_directory(input_path, sub_out)

    encrypt_in_directory(root_in, root_out)

    if failed_files and mode == 0:
        print(f"Warning: {len(failed_files)} files failed to encrypt:")
        for error in failed_files[:10]:
            print(f"  - {error}")
        if len(failed_files) > 10:
            print(f"  ... and {len(failed_files) - 10} more")

    if mode == 0:
        if encrypted_files == 0:
            print("No files encrypted.\n")
        elif encrypted_files == 1:
            print(f"{encrypted_files} file encrypted and saved to '{root_out}'.\n")
        else:
            print(f"{encrypted_files} files encrypted and saved to '{root_out}'.\n")
        return None
    elif mode == 1:
        return encrypted_files, total_files
    return None