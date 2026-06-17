import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from app.services import tools
from app.core.config import settings

def test_whatsapp():
    print("--- Testing WhatsApp Integration ---")
    
    # Check Env Vars
    print(f"Meta Token Present: {bool(settings.WHATSAPP_ACCESS_TOKEN)}")
    print(f"Meta Phone ID: {settings.WHATSAPP_PHONE_NUMBER_ID}")
    print(f"Twilio SID Present: {bool(settings.TWILIO_ACCOUNT_SID)}")
    print(f"Twilio Token Length: {len(settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_AUTH_TOKEN else 0}")
    print(f"Twilio Phone: {settings.TWILIO_PHONE_NUMBER}")
    
    # Ask user for a target number (simulated here)
    target_number = "919024036660" # Replace with a safe test number or hardcode for dev
    message = "Hello from AdmitConnect AI! This is a test message verification."
    
    print(f"\nSending to {target_number}...")
    
    # 1. Try Send
    status = tools.send_whatsapp_message(target_number, message)
    print(f"\nFinal Status: {status}")
    
    if "sent" in status:
        print("✅ SUCCESS: Message Sent")
    else:
        print("❌ FAILED: Message could not be delivered")

if __name__ == "__main__":
    test_whatsapp()
