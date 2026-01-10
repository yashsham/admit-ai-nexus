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

# --- WhatsApp (Twilio Fallback) ---
def send_whatsapp_twilio(to_number: str, message: str) -> str:
    """
    Sends message via Twilio WhatsApp API.
    Used as fallback when Meta Cloud API fails.
    """
    sid = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    api_key = settings.TWILIO_API_KEY_SID
    api_secret = settings.TWILIO_API_KEY_SECRET
    from_ph = settings.TWILIO_PHONE_NUMBER
    
    if not from_ph:
        print("[Twilio] Missing Phone Number.")
        return "failed_twilio_no_phone"
        
    try:
        # Twilio requires "whatsapp:" prefix
        from_wa = f"whatsapp:{from_ph}" if "whatsapp:" not in from_ph else from_ph
        to_wa = f"whatsapp:{to_number}" if "whatsapp:" not in to_number else to_number
        
        # Auth Strategy: API Key (Preferred) > Auth Token
        if api_key and api_secret and sid:
             print(f"[Twilio] Using API Key Auth...")
             client = Client(api_key, api_secret, account_sid=sid)
        elif sid and token:
             print(f"[Twilio] Using Auth Token...")
             client = Client(sid, token)
        else:
             print("[Twilio] Missing Credentials (SID+Token or SID+API Key/Secret).")
             return "failed_twilio_no_creds"

        print(f"[Twilio] Sending from {from_wa} to {to_wa}...")
        
        msg = client.messages.create(
            from_=from_wa,
            body=message,
            to=to_wa
        )
        print(f"[Twilio] Success! SID: {msg.sid}")
        return f"sent_twilio_{msg.sid}"
    except Exception as e:
        print(f"[Twilio] Error: {e}")
        return f"failed_twilio_{str(e)}"

# --- WhatsApp (Strict Cloud API) ---
def send_whatsapp_message(to_number: str, message: str) -> str:
    """
    Sends message via Official WhatsApp Cloud API.
    Strict Backend Implementation (No Deep Links).
    """
    try:
        # 0. Check Usage Limit (Hardcoded user 'auto-agent' or derived context? For now check global/generic or pass user_id)
        # Ideally, we need the user_id. Since these are tools called by Agent, we might need to inject user_id into context.
        # For this iteration, we'll assume a single user context or retrieve from env/global for the 'owner'.
        # Let's assume user_id="default_user" for single-tenant app or get from some context if possible.
        user_id = "default_user" # Placeholder until we pass it dynamically
        
        from app.services.subscription_service import subscription_service
        if not subscription_service.check_usage(user_id, "whatsapp_msgs"):
             return "failed_limit_reached_upgrade_plan"
             
        # 1. Cleaner Phone Number
        clean_number = to_number.replace("whatsapp:", "").replace("+", "").strip()
        
        # Auto-add default country code (91 for India) if missing
        if len(clean_number) == 10 and clean_number.isdigit():
            clean_number = "91" + clean_number

        # 2. Check Credentials
        if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
            print(f"[WhatsApp] FAILURE: Missing Credentials for {clean_number}")
            return "failed_missing_credentials"

        # 3. Call Cloud API
        url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_number,
            "text": {"body": message}
        }
        
        print(f"[WhatsApp] Sending to {clean_number}...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            print(f"[WhatsApp] SUCCESS: Message sent to {clean_number}")
            subscription_service.log_usage(user_id, "whatsapp_msgs", 1)
            return "sent_cloud_api"
        else:
            print(f"[WhatsApp] API ERROR {response.status_code}: {response.text}")
            
            # Twilio Fallback Logic
            print(f"[WhatsApp] Meta API Failed. Attempting Twilio Fallback...")
            twilio_status = send_whatsapp_twilio(clean_number, message)
            
            if "sent" in twilio_status:
                subscription_service.log_usage(user_id, "whatsapp_msgs", 1)
                return twilio_status # Return Twilio success
            
            error_msg = response.text
            # If both fail, fallback to Manual Link
            error_msg = response.text
            # --- SECRET FALLBACK: Generate Manual Link ---
            import urllib.parse
            encoded_message = urllib.parse.quote(message)
            deep_link = f"https://wa.me/{clean_number}?text={encoded_message}"
            
            print(f"\n[SECRET FALLBACK] Meta rejected the call. Use this link to send manually:")
            print(f" {deep_link} \n")
            
            return f"failed_api_{response.status_code}_{error_msg}"

    except Exception as e:
        print(f"[WhatsApp] EXCEPTION: {e}")
        return f"error_exception_{str(e)}"

# --- Email (SendGrid / SMTP) ---
def send_email(to_email: str, subject: str, body: str, html_content: str = None) -> str:
    """
    Sends an email using standard SMTP (Gmail SSL) PRIORITY.
    Falls back to SendGrid if SMTP fails.
    """
    try:
        # 0. Check Usage Limit
        user_id = "default_user" 
        from app.services.subscription_service import subscription_service
        if not subscription_service.check_usage(user_id, "email_sent"):
             return "failed_limit_reached_upgrade_plan"
             
        # Use html_content if provided, else use body
        final_content = html_content if html_content else body
        is_html = True if html_content or "<html>" in final_content or "<br>" in final_content else False

        # 1. PRIORITY: SMTP (Gmail)
        gmail_user = os.getenv("GMAIL_USER", "").strip()
        gmail_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
        
        if gmail_user and gmail_password:
            try:
                print(f"DEBUG: Attempting SMTP (Priority) to {to_email} via {gmail_user} | Subject: {subject}")
                
                import email.utils
                
                smtp_host = 'smtp.gmail.com'
                smtp_port = 465  # SSL Port
                
                # Simple direct connection relying on system DNS resolution
                print(f"DEBUG: Connecting directly to {smtp_host}:{smtp_port} (SSL)")
                
                msg = MIMEMultipart()
                # Friendly Name Format: "Admit AI <email@gmail.com>"
                msg['From'] = f"Admit AI Nexus <{gmail_user}>"
                msg['To'] = to_email
                msg['Subject'] = subject
                msg['Date'] = email.utils.formatdate(localtime=True)
                msg['Message-ID'] = email.utils.make_msgid()
                msg['X-Mailer'] = "AdmitAI-Mailer/1.0"
                msg['X-Priority'] = "3" # Normal
                
                if is_html:
                    msg.attach(MIMEText(final_content, 'html'))
                else:
                    msg.attach(MIMEText(final_content, 'plain'))
                
                server = smtplib.SMTP_SSL(smtp_host, smtp_port)
                server.login(gmail_user, gmail_password)
                text = msg.as_string()
                server.sendmail(gmail_user, to_email, text)
                server.quit()
                print(f"DEBUG: SMTP Send Success to {to_email}")
                subscription_service.log_usage(user_id, "email_sent", 1)
                return "sent_smtp"
            except Exception as e:
                print(f"DEBUG: SMTP Failed: {e}. Falling back to SendGrid.")
                # Fall through to SendGrid
                pass
        else:
            print("DEBUG: No SMTP Credentials found. Trying SendGrid.")

        # 2. FALLBACK: SendGrid
        print(f"DEBUG: Checking SendGrid API Key: {'Found' if settings.SENDGRID_API_KEY else 'Not Found'}")
        if settings.SENDGRID_API_KEY:
            try:
                print(f"DEBUG: Attempting SendGrid (Fallback) to {to_email}")
                url = "https://api.sendgrid.com/v3/mail/send"
                headers = {
                    "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                    "Content-Type": "application/json"
                }
                
                content_obj = {
                    "type": "text/html" if is_html else "text/plain", 
                    "value": final_content
                }
                
                # Use GMAIL_USER as the "from" address if available, as it's likely the verified identity
                from_email = settings.GMAIL_USER if settings.GMAIL_USER else settings.FROM_EMAIL
                
                data = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": from_email},
                    "subject": subject,
                    "content": [content_obj]
                }
                response = requests.post(url, headers=headers, json=data)
                if response.status_code in [200, 201, 202]:
                    print(f"DEBUG: SendGrid Success: {response.status_code}")
                    subscription_service.log_usage(user_id, "email_sent", 1)
                    return "sent_sendgrid"
                else:
                    print(f"DEBUG: SendGrid Failed: {response.status_code} - {response.text}")
                    return f"error_sendgrid_{response.text}"
            except Exception as e:
                print(f"SendGrid Error: {e}")
                return f"error_sendgrid_{str(e)}"
    
    except Exception as e:
        print(f"Email Exception: {e}")
        return f"error_{str(e)}"

    # If we get here, everything failed
    print(f"❌ FAILED: All email methods failed for {to_email}")
    return "failed_all_methods"

# --- Voice Call (Placeholder for Retell / Bland AI) ---
# --- Voice Call (Retell AI) ---
def make_voice_call(to_number: str, context_variables: dict = None) -> str:
    """
    Initiates a voice call using Retell AI.
    Requires RETELL_API_KEY and RETELL_AGENT_ID defined in environment.
    """
    RETELL_API_KEY = settings.RETELL_API_KEY
    RETELL_AGENT_ID = settings.RETELL_AGENT_ID
    
    # 0. Check Limits
    user_id = "default_user"
    from app.services.subscription_service import subscription_service
    if not subscription_service.check_usage(user_id, "voice_calls"):
             return "failed_limit_reached_upgrade_plan"
    
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
            subscription_service.log_usage(user_id, "voice_calls", 1)
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
