from services import tools
import os

# 1. Force BAD credentials
os.environ["GMAIL_USER"] = "bad_user@gmail.com"
os.environ["GMAIL_APP_PASSWORD"] = "wrong_pass"
os.environ["SENDGRID_API_KEY"] = "" # Disable SG

# 2. Try Send
print("Attempting to send with BAD credentials...")
status = tools.send_email("test@example.com", "Test", "Body")
print(f"Status: {status}")

# 3. Verify it is NOT 'delivered'
if "failed" in status or "error" in status:
    print("PASS: System correctly identifies failure.")
    if "sent" in status or "mock" in status:
         print("FAIL: System falsely reports success.")
else:
    print(f"FAIL: Unexpected status {status}")
