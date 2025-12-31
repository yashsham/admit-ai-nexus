import os
from dotenv import load_dotenv

# Force reload
load_dotenv(override=True)

print("--- ENV DEBUG ---")
sid = os.getenv("TWILIO_ACCOUNT_SID")
token = os.getenv("TWILIO_AUTH_TOKEN")
phone = os.getenv("TWILIO_PHONE_NUMBER")

print(f"SID: '{sid}'" if sid else "SID: None")
print(f"TOKEN: '{token[:4]}...'" if token else "TOKEN: None")
print(f"PHONE: '{phone}'" if phone else "PHONE: None")

with open(".env", "r") as f:
    print(f"\n--- CHECKING backend/.env ---")
    vals = f.read()
    if "TWILIO_PHONE_NUMBER" in vals:
         print("FOUND in backend/.env")
    else:
         print("NOT FOUND in backend/.env")

try:
    with open("../.env", "r") as f:
        print(f"\n--- CHECKING root .env ---")
        vals = f.read()
        if "TWILIO_PHONE_NUMBER" in vals:
             print("FOUND in root .env")
        else:
             print("NOT FOUND in root .env")
except FileNotFoundError:
    print("Root .env not found")
