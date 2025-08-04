from src.decryption.decryption import decrypt_file, decrypt_directory
from src.encryption.encryption import encrypt_file, encrypt_directory


def encrypt():
    print("Do you want to encrypt a file or the input directory?")
    mode = input("Enter (f/d): ")
    if mode == 'f':
        filename = input("Enter filename: ")
        password = input("Password: ")
        encrypt_file(password, filename)
    elif mode == 'd':
        print("Put all files to encrypt in the 'files/input/' directory.")
        password = input("Password: ")
        encrypt_directory(password)
    else:
        print("Invalid mode. Please try again.")
        return


def decrypt():
    print("Do you want to decrypt a file or the encrypted directory?")
    mode = input("Enter (f/d): ")
    if mode == 'f':
        filename = input("Enter filename: ")
        password = input("Password: ")
        decrypt_file(password, filename)
    elif mode == 'd':
        print("Put all encrypted files in the 'files/encrypted/' directory to encrypt.")
        print("Files with another password will be ignored.")
        password = input("Password: ")
        decrypt_directory(password)
    else:
        print("Invalid mode. Please try again.")
        return