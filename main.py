import os
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def derive_key(password: bytes, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(password)


def encrypt_and_save(text: str, password: str, filename: str):
    salt = os.urandom(16)
    iv = os.urandom(16)
    key = derive_key(password.encode(), salt)

    padder = padding.PKCS7(128).padder()
    padded = padder.update(text.encode()) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    with open(filename, "wb") as f:
        f.write(salt + iv + ciphertext)
    print(f"Text encrypted and saved to '{filename}'.")


def load_and_decrypt(password: str, filename: str):
    with open(filename, "rb") as f:
        data = f.read()

    salt = data[:16]
    iv = data[16:32]
    ciphertext = data[32:]
    key = derive_key(password.encode(), salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()

    print("Decrypted text:")
    print(plaintext.decode())


if __name__ == "__main__":
    import sys
    import getpass

    if len(sys.argv) < 3:
        print("Usage:")
        print("  python aes_encryptor.py encrypt <filename>")
        print("  python aes_encryptor.py decrypt <filename>")
        sys.exit(1)

    mode = sys.argv[1]
    filename = sys.argv[2]

    if mode == "encrypt":
        text = input("Text to encrypt: ")
        password = getpass.getpass("Password: ")
        encrypt_and_save(text, password, filename)

    elif mode == "decrypt":
        password = getpass.getpass("Password: ")
        try:
            load_and_decrypt(password, filename)
        except Exception as e:
            print("Decryption failed:", str(e))

    else:
        print("Unknown mode:", mode)
