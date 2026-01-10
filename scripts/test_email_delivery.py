import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

# Append backend to path to import tools if needed, or just test SMTP directly
sys.path.append('d:\\Admit\\backend')

from app.core.config import settings
from app.services import tools

def test_sendgrid():
    if not settings.SENDGRID_API_KEY:
        print("SKIP: SendGrid API Key not found.")
        return False
    
    print("TEST: Testing SendGrid...")
    try:
        from app.services.tools import send_email
        res = send_email("boyblj03@gmail.com", "Test SendGrid", "This is a test.")
        print(f"SendGrid Result: {res}")
        return "sent" in res
    except Exception as e:
        print(f"SendGrid Failed: {e}")
        return False

def test_smtp():
    gmail_user = os.getenv("GMAIL_USER") or settings.GMAIL_USER
    gmail_password = os.getenv("GMAIL_APP_PASSWORD") or settings.GMAIL_APP_PASSWORD
    
    if not gmail_user or not gmail_password:
        print("FAIL: GMAIL_USER or GMAIL_APP_PASSWORD not set in env.")
        # Debug env
        print(f"User: {gmail_user}")
        print(f"Pass: {gmail_password and '******'}")
        return False

    print(f"TEST: Testing SMTP with {gmail_user}...")
    try:
        msg = MIMEMultipart()
        msg['From'] = gmail_user
        msg['To'] = gmail_user # Send to self
        msg['Subject'] = "Admit AI SMTP Test"
        msg.attach(MIMEText("Test Execution", 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(gmail_user, gmail_password)
        server.sendmail(gmail_user, gmail_user, msg.as_string())
        server.quit()
        print("SUCCESS: SMTP Email sent successfully.")
        return True
    except Exception as e:
        print(f"FAIL: SMTP Error: {e}")
        return False

if __name__ == "__main__":
    print("--- Starting Email Delivery Diagnosis ---")
    sg = test_sendgrid()
    smtp = test_smtp()
    print("--- Diagnosis Complete ---")
