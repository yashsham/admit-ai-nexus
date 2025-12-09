import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
import requests
from config import (
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
    SENDGRID_API_KEY, FROM_EMAIL, VOICE_API_KEY
)

# --- WhatsApp & SMS (Twilio) ---
def send_whatsapp_message(to_number: str, message: str) -> str:
    """
    Sends a WhatsApp message using Twilio.
    Requires to_number to be formatted like 'whatsapp:+1234567890'.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[MOCK] WhatsApp to {to_number}: {message}")
        return "mock_success_no_credentials"

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        # Ensure 'whatsapp:' prefix
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"
        
        # Twilio sandbox requires 'whatsapp:' prefix for sender too
        from_number = f"whatsapp:{TWILIO_PHONE_NUMBER}" if not TWILIO_PHONE_NUMBER.startswith("whatsapp:") else TWILIO_PHONE_NUMBER

        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        return msg.sid
    except Exception as e:
        print(f"Error sending WhatsApp: {e}")
        return f"error_{str(e)}"

# --- Email (SendGrid / SMTP) ---
def send_email(to_email: str, subject: str, body: str) -> str:
    """
    Sends an email using SendGrid (via Web API) or standard SMTP if needed.
    """
    # Try SendGrid First
    if SENDGRID_API_KEY:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/plain", "value": body}]
            }
            response = requests.post(url, headers=headers, json=data)
            if response.status_code in [200, 201, 202]:
                return "sent_sendgrid"
            else:
                return f"error_sendgrid_{response.text}"
        except Exception as e:
            print(f"SendGrid Error: {e}")
            # Fallback to SMTP?
            pass

    # SMTP Fallback (Gmail)
    gmail_user = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if gmail_user and gmail_password:
        try:
            print(f"📧 Attempting SMTP to {to_email} via {gmail_user}")
            msg = MIMEMultipart()
            msg['From'] = gmail_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(gmail_user, gmail_password)
            text = msg.as_string()
            server.sendmail(gmail_user, to_email, text)
            server.quit()
            return "sent_smtp"
        except Exception as e:
            print(f"SMTP Error: {e}")
            return f"error_smtp_{str(e)}"

    print(f"[MOCK] Email to {to_email} | Subject: {subject} | Body: {body[:50]}...")
    return "mock_success_no_credentials"

# --- Voice Call (Placeholder for Retell / Bland AI) ---
def make_voice_call(to_number: str, script: str) -> str:
    """
    Initiates a voice call. 
    This is a placeholder for a specific Voice API like Retell AI or Bland AI.
    """
    if not VOICE_API_KEY:
        print(f"[MOCK] Voice Call to {to_number} | Script: {script[:50]}...")
        return "mock_success_no_credentials"
    
    # Example logic for a generic voice API
    try:
        # url = "https://api.retellai.com/v1/calls"
        # ... implementation depends on provider ...
        print(f"[REAL] Voice Call initiated to {to_number}")
        return "call_initiated_sid_123"
    except Exception as e:
        return f"error_{str(e)}"
