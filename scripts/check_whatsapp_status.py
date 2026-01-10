import os
import requests
from dotenv import load_dotenv

# Load env
load_dotenv('d:\\Admit\\backend\\.env')

TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

print("--- WhatsApp Config Check ---")
print(f"Token Found: {bool(TOKEN)}")
print(f"Phone ID Found: {bool(PHONE_ID)}")

if not TOKEN or not PHONE_ID:
    print("CREDENTIALS MISSING. Cannot send.")
    exit()

# Test Recipient (using the one from logs)
RECIPIENT = "918439663198" 
MESSAGE = "Debug test message from Admit AI"

url = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": RECIPIENT,
    "text": {"body": MESSAGE}
}

print(f"\n--- Sending Test Message to {RECIPIENT} ---")
try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Exception: {e}")
