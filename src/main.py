import os
import threading

from src.interface.backend.flask_interface import run_flask
from src.interface.interface import decrypt, encrypt

# mode 0 = console, mode 1 = web, mode 2 = application
mode = 1

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
    print("\n--- Welcome to the File Encryption Tool! ---\n")

    if mode == 0:
        os.makedirs("files/input", exist_ok=True)
        run()
    elif mode == 1:
        os.makedirs("files/web", exist_ok=True)
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        print("Flask server started.")
        input("Press Enter to stop and exit.")
    else:
        print("Coming soon...")

    print("\n--- Thanks for using the File Encryption Tool! ---\n")