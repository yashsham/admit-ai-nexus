from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import traceback
from app.services.supabase_client import supabase
from app.services import tools 
from app.services.campaign_crew import CampaignCrew
from app.services.llm_generation import generate_personalized_content
import time

router = APIRouter()

class CampaignRequest(BaseModel):
    user_id: str
    goal: str
    name: Optional[str] = None
    channels: Optional[List[str]] = ["email", "whatsapp"]

class ExecutionRequest(BaseModel):
    campaign_id: str

# --- Core Logic ---
# --- Core Logic ---
# --- Core Logic ---
import logging
import sys

# Configure File Logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("campaign_debug.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

def run_campaign_execution(campaign_id: str, campaign_data: dict = None, recipients: list = None):
    """
    Executes a campaign SEQUENTIALLY to ensure stability and debugging.
    """
    try:
        logging.info(f"START: Execution for {campaign_id}")
        print(f"START: Execution for {campaign_id}")

        if not campaign_data:
            res = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
            campaign_data = res.data
        
        if not recipients:
            tag_filter = f"campaign:{campaign_id}"
            cand_res = supabase.table("candidates").select("*").cs("tags", [tag_filter]).execute()
            recipients = cand_res.data
            if not recipients:
                 logging.warning(f"No candidates found for {campaign_id}")
                 print(f"Warning: No candidates found for campaign {campaign_id}")
                 return

        logging.info(f"Recipients found: {len(recipients)}")
        print(f"Starting execution for campaign: {campaign_id} with {len(recipients)} recipients")
        
        supabase.table("campaigns").update({"status": "active"}).eq("id", campaign_id).execute()
        
        channels = campaign_data.get("channels", []) or ["email"]
        meta = campaign_data.get("metadata", {})
        ai_prompt = meta.get("ai_prompt", "")
        static_body = meta.get("template_body", "Hello! We have an update for you.")
        
        success_count = 0
        fail_count = 0
        
        for recipient in recipients:
            try:
                r_phone = recipient.get("phone")
                r_email = recipient.get("email")
                logging.info(f"Processing: {recipient.get('name')} | Email: {r_email} | Phone: {r_phone}")
                
                email_subject = "Admit AI Update"
                email_msg = ""
                whatsapp_msg = ""
                
                # Content Generation
                if ai_prompt:
                    try:
                        primary_channel = "email" if "email" in channels else "whatsapp"
                        # Use Campaign Goal + Recipient Context for Link Search
                        search_query = f"{ai_prompt} {recipient.get('college', '')}".strip()
                        # If prompt is too long, maybe just use first 50 chars? Tavily handles long queries okay usually.
                        # Ensuring we ask for an "Official website" helps.
                        verified_link = tools.get_verified_link(f"Official website {search_query}")
                        logging.info(f"Verified Link Found: {verified_link}")
                        # blocking call is fine for sequential/debug
                        generated_response = generate_personalized_content(recipient, ai_prompt, primary_channel, verified_link)
                            
                        email_msg = generated_response
                        whatsapp_msg = generated_response
                        
                        if primary_channel == "email":
                            if "SUBJECT:" in generated_response and "BODY:" in generated_response:
                                parts = generated_response.split("BODY:")
                                email_subject = parts[0].replace("SUBJECT:", "").strip()
                                email_msg = parts[1].strip()
                            else:
                                email_subject = "Information for You"
                            whatsapp_msg = f"{email_subject}. Check your email for details."
                    except Exception as e:
                        logging.error(f"AI Generation Failed for {r_email}: {e}")
                        print(f"AI Gen Error: {e}")
                        # Fallback
                        email_msg = static_body or "Hello, please check our updates."
                        whatsapp_msg = email_msg
                else:
                    email_msg = static_body.replace("{{name}}", recipient.get("name", "Student"))
                    whatsapp_msg = email_msg[:160]

                # WhatsApp
                if ("whatsapp" in channels) and r_phone:
                    try:
                        tools.send_whatsapp_message(r_phone, whatsapp_msg)
                        supabase.table("campaign_executions").insert({
                            "campaign_id": campaign_id, "channel": "whatsapp", "status": "delivered",
                            "recipient": r_phone, "message_content": whatsapp_msg
                        }).execute()
                        success_count += 1
                        logging.info(f"WhatsApp SENT to {r_phone}")
                    except Exception as e:
                        logging.error(f"WhatsApp Failed to {r_phone}: {e}")
                        fail_count += 1
                        
                # Email
                if ("email" in channels):
                    if r_email:
                        try:
                            logging.info(f"Sending Email to {r_email}...")
                            logging.info(f"Subject: {email_subject}")
                            logging.info(f"Content Length: {len(email_msg)} chars")
                            
                            status = tools.send_email(r_email, email_subject, email_msg, html_content=email_msg)
                            logging.info(f"Email Status: {status}")
                            
                            db_status = "delivered" if "sent" in status else "failed"
                            supabase.table("campaign_executions").insert({
                                "campaign_id": campaign_id, "channel": "email", "status": db_status,
                                "recipient": r_email, "message_content": email_msg
                            }).execute()
                            
                            if "sent" in status:
                                success_count += 1
                            else:
                                fail_count += 1
                        except Exception as e:
                            logging.error(f"Email Exception for {r_email}: {e}")
                            fail_count += 1
                    else:
                        logging.warning(f"Skipping Email: No email address for {recipient.get('name')}")

                time.sleep(0.5)
            except Exception as inner_e:
                logging.error(f"Critical Loop Error for recipient {recipient}: {inner_e}")
                print(f"Loop Error: {inner_e}")

        supabase.table("campaigns").update({
            "status": "completed", 
            "updated_at": "now()",
            "messages_sent": success_count
        }).eq("id", campaign_id).execute()
        
        logging.info(f"CAMPAIGN FINISHED: Success={success_count}, Fail={fail_count}")

    except Exception as e:
        logging.critical(f"FATAL CAMPAIGN ERROR: {e}")
        print(f"FATAL ERROR: {e}")

    supabase.table("campaigns").update({
        "status": "completed", 
        "updated_at": "now()",
        "messages_sent": success_count
    }).eq("id", campaign_id).execute()


# --- Endpoints ---

@router.post("/create")
async def create_campaign_endpoint(request: CampaignRequest, background_tasks: BackgroundTasks):
    try:
        try:
            crew = CampaignCrew(request.goal)
            plan_result = crew.plan_campaign()
        except Exception:
            plan_result = "Fallback Plan"
        
        data = {
            "user_id": request.user_id,
            "name": request.name or request.goal[:30],
            "goal": request.goal,
            "status": "active",
            "type": "personalized", 
            "channels": request.channels or ["email", "whatsapp"], 
            "messages_sent": 0,
            "metadata": {"ai_plan": str(plan_result), "ai_prompt": request.goal}
        }
        res = supabase.table("campaigns").insert(data).execute()
        campaign_id = res.data[0]['id']

        # Auto-Execute
        background_tasks.add_task(run_campaign_execution, campaign_id)
        
        return {"success": True, "campaign": res.data[0], "message": "Campaign created and execution started."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute")
async def execute_campaign_endpoint(request: ExecutionRequest, background_tasks: BackgroundTasks):
    try:
        res = supabase.table("campaigns").select("*").eq("id", request.campaign_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        background_tasks.add_task(run_campaign_execution, request.campaign_id)
        return {"success": True, "message": "Execution started."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{campaign_id}")
async def delete_campaign_endpoint(campaign_id: str):
    try:
        supabase.table("campaign_executions").delete().eq("campaign_id", campaign_id).execute()
        tag_filter = f"campaign:{campaign_id}"
        supabase.table("candidates").delete().cs("tags", [tag_filter]).execute()
        supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        return {"success": True, "message": "Campaign deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
