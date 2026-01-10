from dotenv import load_dotenv
import os

load_dotenv()

token = os.getenv("WHATSAPP_ACCESS_TOKEN")
phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

print(f"WHATSAPP_ACCESS_TOKEN_PRESENT: {bool(token)}")
print(f"WHATSAPP_PHONE_NUMBER_ID_PRESENT: {bool(phone_id)}")
