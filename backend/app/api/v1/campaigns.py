from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import traceback
from app.data.supabase_client import supabase
from app.ai.tools import tools 
from app.workflows.campaign_agno import CampaignAgno
from app.ai.models.llm_generation import generate_personalized_content
from app.workflows.task_queue import task_queue
import time

router = APIRouter()

class CampaignRequest(BaseModel):
    user_id: str
    goal: str
    name: Optional[str] = None
    channels: Optional[List[str]] = ["email", "whatsapp"]
    target_audience: Optional[str] = "all" 

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

import concurrent.futures

async def process_recipient(recipient: dict, campaign_id: str, channels: list, campaign_data: dict) -> dict:
    """
    Helper function to process a single recipient for a campaign.
    Returns a dict with success/failure status.
    """
    try:
        r_phone = recipient.get("phone")
        r_email = recipient.get("email")
        logging.info(f"Processing: {recipient.get('name')} | Email: {r_email} | Phone: {r_phone}")
        
        email_subject = "Admit AI Update"
        email_msg = ""
        whatsapp_msg = ""
        
        meta = campaign_data.get("metadata", {})
        ai_prompt = meta.get("ai_prompt", "")
        static_body = meta.get("template_body", "Hello! We have an update for you.")
        
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
                
                # ASYNC Generation Call
                generated_response = await generate_personalized_content(recipient, ai_prompt, primary_channel, verified_link)
                    
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

        success = False
        
        # WhatsApp
        if ("whatsapp" in channels) and r_phone:
            try:
                # TODO: If tools.send_whatsapp_message is slow, wrap in run_in_threadpool
                wa_status = tools.send_whatsapp_message(r_phone, whatsapp_msg)
                
                db_status = "delivered" if "sent" in wa_status else "failed"
                supabase.table("campaign_executions").insert({
                    "campaign_id": campaign_id, "channel": "whatsapp", "status": db_status,
                    "recipient": r_phone, "message_content": whatsapp_msg
                }).execute()
                
                if "sent" in wa_status:
                    logging.info(f"WhatsApp SENT to {r_phone}")
                    success = True
                else:
                    logging.error(f"WhatsApp FAILED to {r_phone}: {wa_status}")
            except Exception as e:
                logging.error(f"WhatsApp Failed to {r_phone}: {e}")
                
        # Email
        if ("email" in channels):
            if r_email:
                try:
                    logging.info(f"Sending Email to {r_email}...")
                    
                    status = tools.send_email(r_email, email_subject, email_msg, html_content=email_msg)
                    logging.info(f"Email Status: {status}")
                    
                    db_status = "delivered" if "sent" in status else "failed"
                    supabase.table("campaign_executions").insert({
                        "campaign_id": campaign_id, "channel": "email", "status": db_status,
                        "recipient": r_email, "message_content": email_msg
                    }).execute()
                    
                    if "sent" in status:
                        success = True
                except Exception as e:
                    logging.error(f"Email Exception for {r_email}: {e}")
            else:
                logging.warning(f"Skipping Email: No email address for {recipient.get('name')}")

        return {"success": success}

    except Exception as inner_e:
        logging.error(f"Critical Worker Error for recipient {recipient}: {inner_e}")
        return {"success": False}


async def run_campaign_execution(campaign_id: str, campaign_data: dict = None, recipients: list = None):
    """
    Executes a campaign using Parallel Async & Batch Processing.
    Optimization: O(N) Sequential -> O(N/10) Parallel, Batch DB Inserts.
    """
    try:
        logging.info(f"START: Execution for {campaign_id}")
        
        if not campaign_data:
            res = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
            campaign_data = res.data
        
        if not recipients:
            meta = campaign_data.get("metadata", {}) or {}
            target_audience = meta.get("target_audience", "all")
            
            if target_audience == "all":
                # Fetch ALL candidates for this user
                owner_id = campaign_data.get("user_id")
                if owner_id:
                     cand_res = supabase.table("candidates").select("*").eq("user_id", owner_id).execute()
                     recipients = cand_res.data
                else:
                     logging.warning(f"No owner_id found for campaign {campaign_id}")
                     recipients = []
            elif target_audience.startswith("tag:"):
                # Fetch by Tag
                tag = target_audience.split("tag:")[1]
                cand_res = supabase.table("candidates").select("*").cs("tags", [tag]).execute()
                recipients = cand_res.data
            else:
                # Fallback: Tag with campaign_id
                tag_filter = f"campaign:{campaign_id}"
                cand_res = supabase.table("candidates").select("*").cs("tags", [tag_filter]).execute()
                recipients = cand_res.data
            
            if not recipients:
                 logging.warning(f"No candidates found for {campaign_id} (Target: {target_audience})")
                 return

        logging.info(f"Recipients found: {len(recipients)}")
        
        # Deduplication
        unique_recipients = []
        seen_contacts = set()
        
        for r in recipients:
            # Identifier: Email or Phone
            identifier = r.get("email") or r.get("phone")
            if identifier and identifier not in seen_contacts:
                seen_contacts.add(identifier)
                unique_recipients.append(r)
        
        logging.info(f"Unique Recipients: {len(unique_recipients)}")
        supabase.table("campaigns").update({"status": "active"}).eq("id", campaign_id).execute()
        
        channels = campaign_data.get("channels", []) or ["email"]
        
        # Parallel Execution with Semaphore to limit concurrency
        import asyncio
        semaphore = asyncio.Semaphore(10) # Process 10 candidates at a time
        
        async def protected_process(recipient):
            async with semaphore:
                try:
                    result = await process_recipient(recipient, campaign_id, channels, campaign_data)
                    return result
                except Exception as e:
                    logging.error(f"Error processing {recipient.get('email', 'unknown')}: {e}")
                    return {"success": False}

        # Wait for all async tasks
        results = await asyncio.gather(*[protected_process(r) for r in unique_recipients])
        
        # --- Update Campaign Stats (Accurate Sync) ---
        # Instead of trusting the volatile return values, we count what was actually logged to DB.
        
        # 1. Count Messages (Email + Whatsapp)
        res_msgs = supabase.table("campaign_executions") \
            .select("id", count="exact", head=True) \
            .eq("campaign_id", campaign_id) \
            .in_("channel", ["email", "whatsapp"]) \
            .eq("status", "delivered") \
            .execute()
        count_msgs = res_msgs.count or 0

        # 2. Count Calls (Voice)
        res_calls = supabase.table("campaign_executions") \
            .select("id", count="exact", head=True) \
            .eq("campaign_id", campaign_id) \
            .eq("channel", "voice") \
            .eq("status", "completed") \
            .execute()
        count_calls = res_calls.count or 0

        supabase.table("campaigns").update({
            "status": "completed", 
            "updated_at": "now()",
            "messages_sent": count_msgs,
            "calls_made": count_calls
        }).eq("id", campaign_id).execute()
        
        logging.info(f"CAMPAIGN FINISHED: Msgs={count_msgs}, Calls={count_calls}")

    except Exception as e:
        logging.critical(f"FATAL CAMPAIGN ERROR: {e}")
        try:
             supabase.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
        except: pass


# --- Endpoints ---

from app.security.dependencies import get_current_user, User
from app.observability.cost_tracking import verify_usage_limit

@router.post("/create")
async def create_campaign_endpoint(request: CampaignRequest, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    try:
        # Override user_id from token for security
        request.user_id = current_user.id
        try:
            crew = CampaignAgno(request.goal)
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
            "messages_sent": 0,
            "metadata": {"ai_plan": str(plan_result), "ai_prompt": request.goal, "target_audience": request.target_audience}
        }
        res = supabase.table("campaigns").insert(data).execute()
        campaign_id = res.data[0]['id']

        # Auto-Execute via ARQ Worker (or Fallback)
        try:
            queued = await task_queue.enqueue("execute_campaign_task", campaign_id)
            if not queued:
                raise Exception("Redis Enqueue returned False")
        except Exception as e:
            logging.warning(f"Worker Queue Failed ({e}). Using BackgroundTasks fallback.")
            from app.workflows.tasks import execute_campaign_task
            # Pass None as ctx
            background_tasks.add_task(execute_campaign_task, None, campaign_id)
        
        return {"success": True, "campaign": res.data[0], "message": "Campaign created and execution started."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.workflows.event_queue import event_queue

@router.post("/execute")
async def execute_campaign_endpoint(request: ExecutionRequest, background_tasks: BackgroundTasks, usage_allowed: bool = Depends(verify_usage_limit), current_user: User = Depends(get_current_user)):
    try:
        res = supabase.table("campaigns").select("*").eq("id", request.campaign_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Publish to Redis Queue (ARQ) or Fallback
        try:
            queued = await task_queue.enqueue("execute_campaign_task", request.campaign_id)
            if not queued:
                raise Exception("Redis Enqueue returned False")
        except Exception as e:
            logging.warning(f"Worker Queue Failed ({e}). Using BackgroundTasks fallback.")
            from app.workflows.tasks import execute_campaign_task
            background_tasks.add_task(execute_campaign_task, None, request.campaign_id)
        
        return {"success": True, "message": "Campaign queued for execution."}
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
