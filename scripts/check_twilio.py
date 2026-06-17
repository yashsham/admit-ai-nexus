import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load env for testing
load_dotenv('d:\\Admit\\backend\\.env')

SID = os.getenv("TWILIO_ACCOUNT_SID")
TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUM = os.getenv("TWILIO_PHONE_NUMBER")

print(f"Twilio SID: {SID[:6]}..." if SID else "Twilio SID: None")

if not SID or not TOKEN:
    print("Missing Twilio Credentials.")
    exit()

client = Client(SID, TOKEN)

try:
    # Use the number from logs
    RECIPIENT = "whatsapp:+918439663198"
    
    # Twilio REQUIRES 'whatsapp:' prefix for From/To
    from_wa = f"whatsapp:{FROM_NUM}" if "whatsapp:" not in FROM_NUM else FROM_NUM
    
    print(f"Sending via Twilio from {from_wa} to {RECIPIENT}...")
    
    msg = client.messages.create(
        from_=from_wa,
        body="Debug Message: Twilio Fallback Active by Admit AI",
        to=RECIPIENT
    )
    print(f"Success! SID: {msg.sid}")
except Exception as e:
    print(f"Twilio Error: {e}")
