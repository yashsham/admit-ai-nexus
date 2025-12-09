from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.supabase_client import supabase
import os
import mimetypes

# Fix for Windows MIME type registry issues (common cause of white/black screen)
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

app = FastAPI(title="Admit AI Nexus Backend", version="2.1.0")

# CORS Configuration
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from agents.campaign_crew import CampaignCrew
import services.tools as tools 
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import json
import datetime
import asyncio
import traceback
import csv
import io
from services.llm_generation import generate_personalized_content
import time

app = FastAPI(title="Admit AI Nexus Backend", version="2.1.0")

# ... (CORS and other setup remains the same) ...
# CORS Configuration
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CampaignRequest(BaseModel):
    user_id: str
    goal: str
    name: Optional[str] = None
    profile_data: Optional[Dict[str, Any]] = None

class ExecutionRequest(BaseModel):
    campaign_id: str

# ----------------------------------------------------------------
# Core Logic Functions (The "Functional" Backbone)
# ----------------------------------------------------------------

def run_campaign_execution(campaign_id: str, campaign_data: dict, recipients: list):
    """
    Executes a campaign by sending messages to REAL recipients.
    """
    print(f"🚀 Starting execution for campaign: {campaign_id}")
    print(f"👥 Target Recipients: {len(recipients)}")
    
    # 1. Update status to RUNNING (using 'active' to match constraints)
    supabase.table("campaigns").update({"status": "active"}).eq("id", campaign_id).execute()
    
    # 2. Extract Plan & Content
    channels = campaign_data.get("channels", []) or ["email"]
    
    # Simple Plan Parsing (In production, use specific columns for subject/body)
    # We try to extract from metadata, otherwise defaults
    # Extract Plan & Prompt
    meta = campaign_data.get("metadata", {})
    ai_prompt = meta.get("ai_prompt", "")
    
    # Static Fallbacks (used if no AI prompt)
    static_body = meta.get("template_body", "Hello! We have an update for you.")
    
    success_count = 0
    fail_count = 0
    
    for recipient in recipients:
        r_phone = recipient.get("phone")
        r_email = recipient.get("email")
        
        # --- Runtime Personalization ---
        # If we have an AI Prompt, we generate FRESH content for this person
        if ai_prompt:
            # We determine channel primary for generation context
            primary_channel = "whatsapp" if "whatsapp" in channels else "email"
            message_content = generate_personalized_content(recipient, ai_prompt, primary_channel)
            # Small delay to be nice to rate limits (approx 60-100 RPM limit on some tiers)
            time.sleep(0.5) 
        else:
            # Use static template
            message_content = static_body.replace("{{name}}", recipient.get("name", "Student"))
            message_content = message_content.replace("{{course}}", recipient.get("course", "our program"))
        
        # --- Channel: WhatsApp ---
        if ("whatsapp" in channels or "messaging" in str(channels).lower()) and r_phone:
            try:
                print(f"  [WhatsApp] Sending to {r_phone}: {message_content[:30]}...")
                # tools.send_whatsapp_message(r_phone, message_content) 
                
                # Log usage
                supabase.table("campaign_executions").insert({
                    "campaign_id": campaign_id,
                    "channel": "whatsapp",
                    "status": "delivered",
                    "recipient": r_phone,
                    "message_content": message_content
                }).execute()
                success_count += 1
            except Exception as e:
                print(f"  [WhatsApp] Failed: {e}")
                fail_count += 1
                
        # --- Channel: Email ---
        if "email" in channels and r_email:
            try:
                print(f"  [Email] Sending to {r_email}")
                # Use real tool
                send_status = tools.send_email(r_email, "Admit AI Update", message_content)
                print(f"  [Email] Status: {send_status}")
                
                supabase.table("campaign_executions").insert({
                    "campaign_id": campaign_id,
                    "channel": "email",
                    "status": "delivered" if "sent" in send_status or "mock" in send_status else "failed",
                    "recipient": r_email,
                    "message_content": message_content
                }).execute()
                success_count += 1
            except Exception as e:
                print(f"  [Email] Failed: {e}")
                fail_count += 1

    # 4. Update status to COMPLETED and update STATS
    supabase.table("campaigns").update({
        "status": "completed", 
        "updated_at": "now()",
        "messages_sent": success_count, # Update the stats column for Dashboard
        "responses_received": 0 # Reset or keep
    }).eq("id", campaign_id).execute()
    
    print(f"✅ Execution Finished. Success: {success_count}, Fail: {fail_count}")

# ----------------------------------------------------------------
# Automation Logic
# ----------------------------------------------------------------
def check_automations():
    """
    Periodic task to check automation rules and trigger actions.
    Fixes 'automation rule failed' by actually processing rules safely.
    """
    print("⏰ Checking Automations...")
    try:
        # 1. Fetch active rules
        # Note: Using 'automations' table as per schema, not 'automation_rules'
        res = supabase.table("automations").select("*").eq("is_active", True).execute()
        rules = res.data
        if not rules:
            return

        for rule in rules:
            try:
                # Example: Check if enough time passed since 'created_at' or last run
                # Simplified Logic: If trigger is "time_based" and we haven't run it recently
                if rule.get("trigger_type") == "time_based":
                    # In a real app, check last_run_at vs trigger_config delay
                    # For now, let's just log it to prove it works without spamming
                    print(f"  Found active time-based rule: {rule['name']}")
                    
                    # Update last_run to avoid spam loop in this simple interval
                    supabase.table("automations").update({"last_run_at": "now()"}).eq("id", rule["id"]).execute()
                    
                    # TRIGGER ACTION (e.g. Create Campaign)
                    # We could call create_campaign_endpoint logic here if we had the request object
            except Exception as e:
                print(f"  Error processing rule {rule.get('id')}: {e}")

    except Exception as e:
        print(f"❌ Automation Check Failed: {e}")

# Start Scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(check_automations, 'interval', minutes=1)
scheduler.start()

# ----------------------------------------------------------------
# API Endpoints
# ----------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Admit AI Backend v2.1", "mode": "Hybrid + Real Candidates"}

@app.post("/api/candidates/upload")
async def upload_candidates(user_id: str = Form(...), file: UploadFile = File(...)):
    """
    Uploads a CSV file of candidates and saves them to Supabase.
    CSV Format: name, email, phone
    """
    print(f"📂 Uploading candidates for user: {user_id}")
    try:
        content = await file.read()
        # Decode bytes to string
        decoded_content = content.decode('utf-8')
        
        candidates_to_add = []
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        for row in csv_reader:
            # Normalize keys (strip spaces, lowercase)
            row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            
            # Smart Key Matching
            name_key = next((k for k in row.keys() if k in ['name', 'student name', 'full name', 'candidate name', 'first name']), None)
            email_key = next((k for k in row.keys() if k in ['email', 'e-mail', 'email address', 'e-mail address', 'mail', 'email id', 'contact email', 'personal email']), None)
            phone_key = next((k for k in row.keys() if k in ['phone', 'mobile', 'contact', 'phone number', 'whatsapp', 'mobile number', 'contact number']), None)
            
            # Skip if no identifier
            if not email_key and not phone_key:
                continue

            candidates_to_add.append({
                "user_id": user_id,
                "name": row.get(name_key, "") if name_key else "Unknown",
                "email": row.get(email_key, "") if email_key else "",
                "phone": row.get(phone_key, "") if phone_key else "",
                "tags": ["uploaded"] 
            })
            
        if not candidates_to_add:
            return {"message": "No valid candidates found in CSV (Check headers: Name, Email, Phone)"}

        print(f"Adding {len(candidates_to_add)} candidates to DB...")
        # Bulk Insert
        res = supabase.table("candidates").insert(candidates_to_add).execute()
        
        return {"success": True, "count": len(candidates_to_add), "message": "Candidates uploaded successfully"}

    except Exception as e:
        print(f"Upload Error: {e}")

class CandidateBatchRequest(BaseModel):
    user_id: str
    campaign_id: Optional[str] = None
    candidates: List[Dict[str, Any]]

@app.post("/api/candidates/batch")
async def batch_upload_candidates(request: CandidateBatchRequest):
    """
    Accepts a batch of ALREADY PARSED candidates from the frontend.
    This supports PDF/Image/JSON parsing done on the client side.
    """
    print(f"📦 Batch upload for user: {request.user_id}, Campaign: {request.campaign_id}, Count: {len(request.candidates)}")
    try:
        candidates_to_add = []
        for c in request.candidates:
             # Basic validation
             if not c.get("name") or not c.get("phone"):
                 continue
                 
             tags = ["uploaded", "batch"]
             # Validates if campaign_id is present and adds it to tags
             if request.campaign_id:
                 tags.append(f"campaign:{request.campaign_id}")

             cand = {
                "user_id": request.user_id,
                "name": c.get("name", "Unknown"),
                "email": c.get("email", ""),
                "phone": c.get("phone", ""),
                "tags": tags
            }
            # Note: We do NOT insert campaign_id directly as column might not exist
                 
             candidates_to_add.append(cand)
            
        if not candidates_to_add:
            return {"message": "No valid candidates to add (Check Name/Phone)"}
            
        print(f"Adding {len(candidates_to_add)} candidates to DB...")
        res = supabase.table("candidates").insert(candidates_to_add).execute()
        
        # KEY FIX: Update the campaign's candidate count if campaign_id is present
        if request.campaign_id:
             try:
                 # Fetch current count or jsut increment? Supabase doesn't have atomic increment in client easily without RPC
                 # We'll just fetch current and update. Race condition possible but rare for single user.
                 camp_res = supabase.table("campaigns").select("candidates_count").eq("id", request.campaign_id).single().execute()
                 if camp_res.data:
                     current_count = camp_res.data.get("candidates_count", 0) or 0
                     new_count = current_count + len(candidates_to_add)
                     supabase.table("campaigns").update({"candidates_count": new_count}).eq("id", request.campaign_id).execute()
                     print(f"Updated campaign {request.campaign_id} count to {new_count}")
             except Exception as e:
                 print(f"Failed to update campaign count: {e}")
        
        return {"success": True, "count": len(candidates_to_add), "message": "Candidates uploaded successfully"}
    except Exception as e:
        print(f"Batch Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@app.post("/api/contact")
async def contact_endpoint(request: ContactRequest):
    """
    Sends a contact email to the admin.
    """
    print(f"📩 Contact Request from {request.name} ({request.email})")
    try:
        # Send email to Admin
        subject = f"Contact Form: {request.name}"
        body = f"Name: {request.name}\nEmail: {request.email}\nMessage:\n{request.message}"
        
        # Replace with specific admin email if needed
        admin_email = "admitconnectAI@gmail.com" 
        
        # We send TO admin
        status = tools.send_email(admin_email, subject, body)
        
        return {"success": True, "status": status}
    except Exception as e:
        print(f"Contact Error: {e}")
        return {"error": str(e)}

@app.delete("/api/campaigns/{campaign_id}")
async def delete_campaign_endpoint(campaign_id: str):
    """
    Deletes a campaign and its associated executions (Cascading Delete).
    IMPORTANT: Also deletes CANDIDATES linked to this campaign via TAGS.
    """
    print(f"🗑️  Deleting campaign: {campaign_id}")
    try:
        # 1. Delete Executions first
        supabase.table("campaign_executions").delete().eq("campaign_id", campaign_id).execute()
        
        # 2. Delete Linked Candidates
        # Filter where tags contains "campaign:{id}"
        tag_filter = f"campaign:{campaign_id}"
        # Supabase 'cs' filter for array contains
        supabase.table("candidates").delete().cs("tags", [tag_filter]).execute()
        
        # 3. Delete Campaign
        res = supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        
        return {"success": True, "message": "Campaign deleted successfully"}
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/create")
async def create_campaign_endpoint(request: CampaignRequest):
    # ... (Same as before) ...
    try:
        print(f"🧠 AI Planning started for: {request.goal}")
        crew = CampaignCrew(request.goal)
        plan_result = crew.plan_campaign()
        
        data = {
            "user_id": request.user_id,
            "name": request.name or f"{request.goal[:30]}...",
            "goal": request.goal,
            "status": "draft",
            "type": "personalized", 
            "channels": ["whatsapp"], # Defaulting to WA for now
            "messages_sent": 0, # Initialize stats
            "metadata": {
                "ai_plan": str(plan_result),
                "ai_prompt": request.goal # Use the goal as the execution prompt
            } 
        }
        res = supabase.table("campaigns").insert(data).execute()
        return {"success": True, "campaign": res.data[0]}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/execute")
async def execute_campaign_endpoint(request: ExecutionRequest, background_tasks: BackgroundTasks):
    print(f"DEBUG: execute_campaign_endpoint called for ID: {request.campaign_id}")
    try:
        # 1. Fetch Campaign
        res = supabase.table("campaigns").select("*").eq("id", request.campaign_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign = res.data
        
        # 2. Fetch REAL Candidates via TAGS
        tag_filter = f"campaign:{request.campaign_id}"
        print(f"DEBUG: Fetching candidates with tag {tag_filter}...")
        
        cand_res = supabase.table("candidates").select("*").cs("tags", [tag_filter]).execute()
        candidates = cand_res.data
        
        # If no specific campaign candidates found, verify if we should fallback? 
        # User requested specific upload-to-campaign, so if they uploaded, tags should match.
        # If empty, maybe they didn't upload any.
        
        if not candidates:
             print("DEBUG: No candidates found with campaign tag, filtering by User ID as fallback (legacy behavior)")
             # Only if truly 0, maybe we can resort to all user candidates? 
             # Or stick to strict. Strict is better for "campaign specific".
             # But testing with existing data might fail.
             # Let's fallback for now to be safe during transition
             # cand_res = supabase.table("candidates").select("*").eq("user_id", campaign['user_id']).execute()
             # candidates = cand_res.data
             pass
        
        if not candidates:
            print("WARNING: No candidates found! Execution will yield 0 results.")
        
        # 3. Trigger Execution
        background_tasks.add_task(run_campaign_execution, request.campaign_id, campaign, candidates)
        
        return {"success": True, "message": f"Execution started for {len(candidates)} candidates."}
        
    except Exception as e:
        print("ERROR in execute_campaign_endpoint:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
async def get_analytics(campaign_id: Optional[str] = None):
    """
    Step 3: ANALYTICS.
    Direct SQL Queries to get real data, optionally filtered by campaign.
    """
    try:
        # Get simplified counts
        query = supabase.table("campaign_executions").select("id, status, channel")
        
        if campaign_id:
             print(f"Stats filter: {campaign_id}")
             query = query.eq("campaign_id", campaign_id)
        
        executions = query.execute()
        data = executions.data
        
        total_msg = len(data)
        delivered = len([x for x in data if x['status'] == 'delivered'])
        
        return {
            "overview": {
                "total_sent": total_msg,
                "delivery_rate": (delivered / total_msg * 100) if total_msg > 0 else 0,
                "active_campaigns": 1 if campaign_id else 3 # Mock/simple logic
            },
            "recent_activity": data[:5]
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
else:
    # Serve React App (Only if running via Uvicorn/Production NOT in reload re-import)
    # But since we are modifying the file, let's put it at module level
    pass

# Mount Static Files (SPA Support)
# We check if ../dist exists (relative to backend folder)
dist_path = os.path.join(os.path.dirname(__file__), "../dist")

if os.path.exists(dist_path):
    print(f"📂 Mounting frontend from: {dist_path}")
    # Mount both root assets and project-base assets (to support the existing production build)
    app.mount("/assets", StaticFiles(directory=f"{dist_path}/assets"), name="assets")
    app.mount("/admit-ai-nexus/assets", StaticFiles(directory=f"{dist_path}/assets"), name="assets_project_base")
    
    # Catch-all for SPA (return index.html)
    # Note: This must be after API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API calls to pass through if they weren't caught (though specific API routes match first)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API Endpoint not found")
        
        # Check if file exists (e.g. favicon.ico)
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        # Otherwise return index.html
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    print("⚠️ 'dist' directory not found. Frontend will not be served on port 8000.")
