
import os
import sys
from dotenv import load_dotenv

# Load env
load_dotenv('backend/.env')

print("--- ENV CHECK ---")
user = os.getenv("GMAIL_USER")
pw = os.getenv("GMAIL_APP_PASSWORD")
print(f"User: {user}")
print(f"Pass: {'*' * len(pw) if pw else 'None'}")

# Mock specific tool import to test logic without full app overhead if needed
# But better to import the actual module
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    import services.tools as tools
    print("\n--- TEST SEND ---")
    # We won't actually send to a real email to avoid spamming unless user provided one,
    # but we will call it and expect a "failed_no_credentials" or "sent_smtp" (if they have env vars set locally).
    # Since I don't know if they have valid creds in this invalid env file, I expect failure or mock success.
    # Wait, the user said "NO MOCK", so I removed the mock.
    # It should return "failed_no_credentials_configured" if variables are missing.
    
    result = tools.send_email("test@example.com", "Test Subject", "Test Body")
    print(f"Result: {result}")
except Exception as e:
    print(f"Import/Exec Error: {e}")
