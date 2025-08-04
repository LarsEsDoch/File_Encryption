import os

from src.interface.interface import decrypt, encrypt


def run():
    while True:
        print("Modes:")
        print("1. Encrypt")
        print("2. Decrypt")
        print("3. Exit")
        mode = input("Enter mode: ")
        if mode == "1":
            encrypt()
        elif mode == "2":
            decrypt()
        elif mode == "3":
            exit()
        else:
            print("Invalid mode. Please try again.")

if __name__ == "__main__":
    os.makedirs("files/input", exist_ok=True)
    print("\n--- Welcome to the File Encryption Tool! ---\n")
    run()
    print("\n--- Thanks for using the File Encryption Tool! ---\n")