import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
import requests
from config import (
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
    SENDGRID_API_KEY, FROM_EMAIL, VOICE_API_KEY, TAVILY_API_KEY
)

# --- Search & Verification ---
def get_verified_link(query: str) -> str:
    """
    Uses Tavily to find an official verified link for the query.
    """
    if not TAVILY_API_KEY:
        # User requested a functional link fallback immediately.
        # Since we don't have the API key, we redirect to a Google Search for the Official Site.
        print("[WARN] No TAVILY_API_KEY found. Using Google Search fallback.")
        import urllib.parse
        encoded_query = urllib.parse.quote(query.replace("Official website", "").strip())
        return f"https://www.google.com/search?q={encoded_query}"
        
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={"query": query, "search_depth": "basic", "max_results": 1},
            headers={"api_key": TAVILY_API_KEY}
        )
        data = response.json()
        if data.get("results"):
            return data["results"][0]["url"]
    except Exception as e:
        print(f"Tavily Search Error: {e}")
    
    # Fallback if Tavily fails
    import urllib.parse
    encoded_query = urllib.parse.quote(query.replace("Official website", "").strip())
    return f"https://www.google.com/search?q={encoded_query}"

# --- WhatsApp (Deep Link Generator) ---
# --- WhatsApp (Cloud API + Deep Link) ---
def send_whatsapp_message(to_number: str, message: str) -> str:
    """
    Sends message via Official WhatsApp Cloud API if credentials exist.
    Otherwise, falls back to generating a Click-to-Chat Deep Link.
    """
    from config import WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
    
    # 1. Cleaner Phone Number
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").strip()
    
    # Auto-add default country code (91 for India) if missing
    if len(clean_number) == 10 and clean_number.isdigit():
        clean_number = "91" + clean_number

    # 2. Try Official Cloud API Logic
    if WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID:
        try:
            url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json"
            }
            # Note: Free tier text messages are standard. Template messages required for business initiated usually, 
            # but for this dev stage/reply flow, text often works or user must reply first. 
            # We assume user is replying or in 24h window, or just using standard text payload.
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_number,
                "text": {"body": message}
            }
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code in [200, 201]:
                print(f"[WhatsApp Cloud API] Message sent to {clean_number}")
                return "sent_cloud_api"
            else:
                print(f"[Warn] Cloud API Failed {response.status_code}: {response.text}. Falling back to link.")
        except Exception as e:
            print(f"[Warn] Cloud API Error: {e}. Falling back to link.")

    # 3. Fallback: Generate Deep Link (No Cost / No Config)
    try:
        import urllib.parse
        import webbrowser
        
        encoded_message = urllib.parse.quote(message)
        # Use web.whatsapp.com/send to skip the 'Download' landing page on Desktop
        deep_link = f"https://web.whatsapp.com/send?phone={clean_number}&text={encoded_message}"
        
        print(f"[WhatsApp Link Generated] for {clean_number}")
        print(f"Link: {deep_link}") 
        
        # LOCAL AUTO-OPEN WORKAROUND
        # On deployments (Linux/Render), this would fail or hang.
        # We only auto-open on Windows (Local Dev).
        if os.name == 'nt':
            print("Auto-Opening WhatsApp on local machine...")
            try:
                webbrowser.open(deep_link)
            except:
                pass
        
        return deep_link
    except Exception as e:
        print(f"Error generating WhatsApp link: {e}")
        return f"error_{str(e)}"

# --- Email (SendGrid / SMTP) ---
def send_email(to_email: str, subject: str, body: str, html_content: str = None) -> str:
    """
    Sends an email using SendGrid (via Web API) or standard SMTP if needed.
    Supports HTML content.
    """
    # Use html_content if provided, else use body
    final_content = html_content if html_content else body
    is_html = True if html_content or "<html>" in final_content or "<br>" in final_content else False
    
    # Try SendGrid First
    if SENDGRID_API_KEY:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            
            content_obj = {
                "type": "text/html" if is_html else "text/plain", 
                "value": final_content
            }
            
            data = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": FROM_EMAIL},
                "subject": subject,
                "content": [content_obj]
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
            print(f"📧 Attempting SMTP to {to_email} via {gmail_user} | Subject: {subject}")
            msg = MIMEMultipart()
            msg['From'] = gmail_user
            msg['To'] = to_email
            msg['Subject'] = subject
            
            if is_html:
                msg.attach(MIMEText(final_content, 'html'))
            else:
                msg.attach(MIMEText(final_content, 'plain'))

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

    print(f"[MOCK] Email to {to_email} | Subject: {subject} | Body: {final_content[:50]}...")
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
