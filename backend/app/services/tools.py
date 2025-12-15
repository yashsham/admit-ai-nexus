import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
import requests
from app.core.config import settings

# --- Search & Verification ---
def get_verified_link(query: str) -> str:
    """
    Uses Tavily to find an official verified link for the query.
    """
    if not settings.TAVILY_API_KEY:
        # User requested a functional link fallback immediately.
        # Since we don't have the API key, we redirect to a Google Search for the Official Site.
        print("[WARN] No settings.TAVILY_API_KEY found. Using Google Search fallback.")
        import urllib.parse
        encoded_query = urllib.parse.quote(query.replace("Official website", "").strip())
        return f"https://www.google.com/search?q={encoded_query}"
        
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={"query": query, "search_depth": "basic", "max_results": 1},
            headers={"api_key": settings.TAVILY_API_KEY}
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
    # Settings loaded globally
    
    # 1. Cleaner Phone Number
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").strip()
    
    # Auto-add default country code (91 for India) if missing
    if len(clean_number) == 10 and clean_number.isdigit():
        clean_number = "91" + clean_number

    # 2. Try Official Cloud API Logic
    if settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
        try:
            url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
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
    if settings.SENDGRID_API_KEY:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            
            content_obj = {
                "type": "text/html" if is_html else "text/plain", 
                "value": final_content
            }
            
            data = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": settings.FROM_EMAIL},
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
    gmail_user = os.getenv("GMAIL_USER", "").strip()
    gmail_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    
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

            # Force IPv4 Resolution to bypass Render IPv6 issues
            import socket
            import ssl
            
            smtp_host = 'smtp.gmail.com'
            smtp_port = 465
            
            # Resolve to IPv4
            addr_info = socket.getaddrinfo(smtp_host, smtp_port, socket.AF_INET, socket.SOCK_STREAM)
            ip_address = addr_info[0][4][0]
            print(f"DEBUG: Resolved {smtp_host} to IPv4: {ip_address}")

            # Create insecure SSL context (since we are using IP, hostname check would fail)
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            server = smtplib.SMTP_SSL(ip_address, smtp_port, context=context)
            server.login(gmail_user, gmail_password)
            text = msg.as_string()
            server.sendmail(gmail_user, to_email, text)
            server.quit()
            return "sent_smtp"
        except Exception as e:
            print(f"SMTP Error: {e}")
            return f"error_smtp_{str(e)}"

    # If we get here, NO credentials were found
    print(f"❌ FAILED: No Email Credentials found for {to_email}")
    return "failed_no_credentials_configured"

# --- Voice Call (Placeholder for Retell / Bland AI) ---
# --- Voice Call (Retell AI) ---
def make_voice_call(to_number: str, context_variables: dict = None) -> str:
    """
    Initiates a voice call using Retell AI.
    Requires RETELL_API_KEY and RETELL_AGENT_ID defined in environment.
    """
    RETELL_API_KEY = settings.RETELL_API_KEY
    RETELL_AGENT_ID = settings.RETELL_AGENT_ID
    
    if not RETELL_API_KEY or not RETELL_AGENT_ID:
        print(f"[MOCK] Voice Call to {to_number} | Context: {context_variables}")
        return "mock_success_no_credentials"
    
    try:
        url = "https://api.retellai.com/v2/create-phone-call"
        headers = {
            "Authorization": f"Bearer {RETELL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # NOTE: Retell requires a 'from_number' if the agent doesn't have one bounded?
        # Docs say: "from_number": "..."
        # We will try omitting it if the agent has a number, or use a placeholder to catch error.
        
        payload = {
            "agent_id": RETELL_AGENT_ID,
            "to_number": to_number,
            "retell_llm_dynamic_variables": context_variables or {}
        }
        
        # If user hardcoded a number in env?
        from_num = os.getenv("RETELL_FROM_NUMBER")
        if from_num:
            payload["from_number"] = from_num

        print(f"[Retell] Initiating call to {to_number} using Agent {RETELL_AGENT_ID}...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            call_id = data.get("call_id")
            print(f"[Retell] Success! Call ID: {call_id}")
            return f"call_initiated_{call_id}"
        else:
            print(f"[Retell] Failed: {response.text}")
            return f"error_retell_{response.status_code}_{response.text}"
            
    except Exception as e:
        print(f"[Retell] Exception: {e}")
        return f"error_{str(e)}"

# --- Scheduler ---
from apscheduler.schedulers.asyncio import AsyncIOScheduler
scheduler = AsyncIOScheduler()
