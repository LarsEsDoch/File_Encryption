from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import os

# 32-Byte Schlüssel (256 Bit)
key = os.urandom(32)
iv = os.urandom(16)

# Daten zum Verschlüsseln
plaintext = b"Geheime Nachricht"

# Padding (AES benötigt Blockgröße 16 Byte)
padder = padding.PKCS7(128).padder()
padded_data = padder.update(plaintext) + padder.finalize()

# Verschlüsseln
cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
encryptor = cipher.encryptor()
ciphertext = encryptor.update(padded_data) + encryptor.finalize()

# Entschlüsseln
decryptor = cipher.decryptor()
decrypted_padded = decryptor.update(ciphertext) + decryptor.finalize()

# Padding entfernen
unpadder = padding.PKCS7(128).unpadder()
decrypted_data = unpadder.update(decrypted_padded) + unpadder.finalize()

print("Klartext:", decrypted_data.decode())
