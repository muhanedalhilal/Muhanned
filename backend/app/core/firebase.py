import os
import firebase_admin
from firebase_admin import credentials

def init_firebase():
    """
    Initializes the Firebase Admin SDK.
    It looks for 'serviceAccountKey.json' in the root of the backend folder.
    """
    # Avoid initializing multiple times
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized.")
        else:
            print(f"Warning: Firebase credentials not found at {cred_path}. Authentication will not work.")
