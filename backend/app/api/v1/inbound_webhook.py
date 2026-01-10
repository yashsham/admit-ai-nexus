from fastapi import APIRouter, Request, HTTPException
from app.workflows.auto_reply import process_inbound_message

router = APIRouter()

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Receives WhatsApp Webhook events (Messages).
    """
    try:
        data = await request.json()
        
        # Verify Token (Optional, usually for initial setup)
        # if request.method == "GET": handle_verify(request)
        
        # Process Entry
        entry = data.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        
        if "messages" in value:
            message = value["messages"][0]
            from_number = message.get("from")
            text = message.get("text", {}).get("body", "")
            
            if text:
                # Run Logic
                print(f"[Webhook] Received msg from {from_number}: {text}")
                process_inbound_message(from_number, text, source="whatsapp")
                
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook Error: {e}")
        return {"status": "error"}

@router.post("/webhook/email")
async def email_webhook(request: Request):
    """
    Receives SendGrid Inbound Parse Webhook.
    """
    try:
        # SendGrid sends multipart form data
        form = await request.form()
        sender = form.get("from")
        text = form.get("text")
        
        if sender and text:
             print(f"[Webhook] Received email from {sender}")
             process_inbound_message(sender, text, source="email")
             
        return {"status": "ok"}
    except Exception as e:
        print(f"Email Webhook Error: {e}")
        return {"status": "error"}
