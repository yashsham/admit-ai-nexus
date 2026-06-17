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
def send_whatsapp_message(to_number: str, message: str, user_id: str = "default_user") -> str:
    """
    Sends message via Official WhatsApp Cloud API.
    Strict Backend Implementation (No Deep Links).
    """
    try:
        # 0. Check Usage Limit
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

# --- Email Multi-Provider Router ---
def send_email(to_email: str, subject: str, body: str, html_content: str = None, user_id: str = "default_user") -> str:
    """
    Sends an email using the best available channel (HTTP APIs to bypass cloud firewall blocks, or SMTP).
    """
    try:
        # 0. Check Usage Limit
        from app.services.subscription_service import subscription_service
        if not subscription_service.check_usage(user_id, "email_sent"):
             return "failed_limit_reached_upgrade_plan"
             
        final_content = html_content if html_content else body
        is_html = True if html_content or "<html>" in final_content or "<br>" in final_content else False
        
        # SMTP / Gmail Config
        gmail_user = os.getenv("GMAIL_USER", "").strip() or getattr(settings, "GMAIL_USER", "").strip()
        gmail_password = os.getenv("GMAIL_APP_PASSWORD", "").strip() or getattr(settings, "GMAIL_APP_PASSWORD", "").strip()

        # 1. OPTION A: Google Apps Script Web App Relay (100% Free, Bypasses firewall, Real Gmail Sender, No SMTP block)
        gas_url = getattr(settings, "GOOGLE_APPS_SCRIPT_URL", None)
        if gas_url:
            try:
                print(f"DEBUG: Attempting Google Apps Script Relay to {to_email}...")
                import json
                payload = {
                    "to": to_email,
                    "subject": subject,
                    "body": final_content,
                    "isHtml": is_html
                }
                headers = {"Content-Type": "application/json"}
                response = requests.post(gas_url, data=json.dumps(payload), headers=headers, timeout=15)
                if response.status_code in [200, 201]:
                    print(f"DEBUG: Google Apps Script Relay Success to {to_email}")
                    subscription_service.log_usage(user_id, "email_sent", 1)
                    return "sent_apps_script"
                else:
                    print(f"DEBUG: Google Apps Script Relay Failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"DEBUG: Google Apps Script Relay Exception: {e}")

        # 2. OPTION B: Gmail REST API (100% Free, Bypasses firewall, Real Gmail Sender via OAuth2)
        client_id = getattr(settings, "GMAIL_CLIENT_ID", None)
        client_secret = getattr(settings, "GMAIL_CLIENT_SECRET", None)
        refresh_token = getattr(settings, "GMAIL_REFRESH_TOKEN", None)
        
        if client_id and client_secret and refresh_token:
            try:
                print(f"DEBUG: Attempting Gmail REST API to {to_email}...")
                token_url = "https://oauth2.googleapis.com/token"
                token_payload = {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
                token_res = requests.post(token_url, data=token_payload, timeout=10)
                if token_res.status_code == 200:
                    access_token = token_res.json().get("access_token")
                    
                    import base64
                    send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
                    headers = {
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                    
                    msg = MIMEMultipart()
                    msg['To'] = to_email
                    from_addr = gmail_user if gmail_user else f"Admit AI Nexus <{settings.FROM_EMAIL}>"
                    msg['From'] = from_addr
                    msg['Subject'] = subject
                    
                    if is_html:
                        msg.attach(MIMEText(final_content, 'html'))
                    else:
                        msg.attach(MIMEText(final_content, 'plain'))
                        
                    raw_msg = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
                    send_payload = {"raw": raw_msg}
                    
                    send_res = requests.post(send_url, json=send_payload, headers=headers, timeout=10)
                    if send_res.status_code == 200:
                        print(f"DEBUG: Gmail REST API Success to {to_email}")
                        subscription_service.log_usage(user_id, "email_sent", 1)
                        return "sent_gmail_api"
                    else:
                        print(f"DEBUG: Gmail REST API Send Failed: {send_res.status_code} - {send_res.text}")
                else:
                    print(f"DEBUG: Gmail OAuth Refresh Failed: {token_res.status_code} - {token_res.text}")
            except Exception as e:
                print(f"DEBUG: Gmail REST API Exception: {e}")

        # 3. OPTION C: Resend API (HTTP 443)
        resend_key = getattr(settings, "RESEND_API_KEY", None)
        if resend_key:
            try:
                print(f"DEBUG: Attempting Resend API to {to_email}...")
                url = "https://api.resend.com/emails"
                headers = {
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                }
                
                from_email = settings.FROM_EMAIL if settings.FROM_EMAIL else "onboarding@resend.dev"
                if "onboarding@resend.dev" in from_email or not settings.FROM_EMAIL:
                    from_email = "onboarding@resend.dev"
                    
                payload = {
                    "from": f"Admit AI <{from_email}>",
                    "to": to_email,
                    "subject": subject,
                    "html": final_content if is_html else None,
                    "text": final_content if not is_html else None
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201, 202]:
                    print(f"DEBUG: Resend API Success to {to_email}")
                    subscription_service.log_usage(user_id, "email_sent", 1)
                    return "sent_resend"
                else:
                    print(f"DEBUG: Resend API Failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"DEBUG: Resend API Exception: {e}")

        # 4. OPTION D: Brevo API (HTTP 443)
        brevo_key = getattr(settings, "BREVO_API_KEY", None)
        if brevo_key:
            try:
                print(f"DEBUG: Attempting Brevo API to {to_email}...")
                url = "https://api.brevo.com/v3/smtp/email"
                headers = {
                    "accept": "application/json",
                    "api-key": brevo_key,
                    "content-type": "application/json"
                }
                from_email = settings.FROM_EMAIL if settings.FROM_EMAIL else "noreply@admitai.com"
                payload = {
                    "sender": {"name": "Admit AI Nexus", "email": from_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": final_content if is_html else None,
                    "textContent": final_content if not is_html else None
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201, 202]:
                    print(f"DEBUG: Brevo API Success to {to_email}")
                    subscription_service.log_usage(user_id, "email_sent", 1)
                    return "sent_brevo"
                else:
                    print(f"DEBUG: Brevo API Failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"DEBUG: Brevo API Exception: {e}")

        # 5. OPTION E: SendGrid API (HTTP 443)
        sg_key = getattr(settings, "SENDGRID_API_KEY", None)
        if sg_key:
            try:
                print(f"DEBUG: Attempting SendGrid API to {to_email}")
                url = "https://api.sendgrid.com/v3/mail/send"
                headers = {
                    "Authorization": f"Bearer {sg_key}",
                    "Content-Type": "application/json"
                }
                from_email = settings.FROM_EMAIL if settings.FROM_EMAIL else "noreply@admitai.com"
                payload = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": from_email, "name": "Admit AI Nexus"},
                    "subject": subject,
                    "content": [{"type": "text/html" if is_html else "text/plain", "value": final_content}]
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201, 202]:
                    print(f"DEBUG: SendGrid API Success to {to_email}")
                    subscription_service.log_usage(user_id, "email_sent", 1)
                    return "sent_sendgrid"
                else:
                    print(f"DEBUG: SendGrid API Failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"DEBUG: SendGrid API Exception: {e}")

        # 6. FALLBACK: SMTP (Gmail SSL - Works locally, fails on Render Free tier due to port block)
        if gmail_user and gmail_password:
            try:
                print(f"DEBUG: Attempting SMTP (Fallback) to {to_email} via {gmail_user} | Subject: {subject}")
                import email.utils
                smtp_host = 'smtp.gmail.com'
                smtp_port = 465
                
                msg = MIMEMultipart()
                msg['From'] = f"Admit AI Nexus <{gmail_user}>"
                msg['To'] = to_email
                msg['Subject'] = subject
                msg['Date'] = email.utils.formatdate(localtime=True)
                msg['Message-ID'] = email.utils.make_msgid()
                msg['X-Mailer'] = "AdmitAI-Mailer/1.0"
                msg['X-Priority'] = "3"
                
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
                print(f"DEBUG: SMTP Failed: {e}")
                return f"error_smtp_{str(e)}"
        else:
            print("DEBUG: No SMTP Credentials found (GMAIL_USER / GMAIL_APP_PASSWORD).")
            return "error_no_smtp_credentials"
            
    except Exception as e:
        print(f"Email Exception: {e}")
        return f"error_{str(e)}"

    print(f"❌ FAILED: Email send failed for {to_email}")
    return "failed_all_methods"

# --- Voice Call (Placeholder for Retell / Bland AI) ---
# --- Voice Call (Retell AI) ---
# --- Voice Call (Asterisk/SIP) ---
async def make_voice_call(to_number: str, context_variables: dict = None) -> str:
    """
    Initiates a voice call using Asterisk AMI.
    Replaces Retell AI.
    """
    from app.services.asterisk_service import asterisk_service
    
    # 0. Check Limits
    user_id = "default_user"
    from app.services.subscription_service import subscription_service
    if not subscription_service.check_usage(user_id, "voice_calls"):
             return "failed_limit_reached_upgrade_plan"
    
    try:
        # Context variables can be passed as channel vars to Asterisk
        # e.g. {'campaign_id': '123'} -> PJSIP header or channel variable
        result = await asterisk_service.initiate_call(
            to_number=to_number,
            channel_vars=context_variables
        )
        
        if "success" in result:
            subscription_service.log_usage(user_id, "voice_calls", 1)
            
        return result
            
    except Exception as e:
        print(f"[Asterisk] Exception: {e}")
        return f"error_{str(e)}"

# --- Scheduler ---
from apscheduler.schedulers.asyncio import AsyncIOScheduler
scheduler = AsyncIOScheduler()
