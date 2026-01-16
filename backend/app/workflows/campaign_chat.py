import json
from enum import Enum
from typing import Optional, Dict, Any, List
from app.core.cache import cache
from app.data.supabase_client import supabase
from app.workflows.campaign_agno import CampaignAgno
import logging
import re

logger = logging.getLogger("workflow.campaign_chat")

class CampaignState(str, Enum):
    IDLE = "IDLE"
    ASK_NAME = "ASK_NAME"
    ASK_TYPE = "ASK_TYPE"
    ASK_AUDIENCE = "ASK_AUDIENCE"
    ASK_INSTRUCTIONS = "ASK_INSTRUCTIONS"
    CONFIRM = "CONFIRM"
    CREATING = "CREATING"
    
    # New States
    ASK_UPLOAD = "ASK_UPLOAD"
    ASK_CANDIDATE_DETAILS = "ASK_CANDIDATE_DETAILS"

class CampaignChatWorkflow:
    """
    Stateful workflow for creating campaigns via chat.
    Uses Redis to persist state between requests.
    Now supports adding candidates after creation.
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_key = f"campaign_chat:{user_id}"

    async def get_state(self) -> Dict[str, Any]:
        """Retrieve current state from cache."""
        data = await cache.get(self.cache_key)
        if data:
            return json.loads(data)
        return {"state": CampaignState.IDLE.value, "data": {}}

    async def update_state(self, state: CampaignState, data: Dict[str, Any]):
        """Update state in cache with 10-minute TTL."""
        payload = {"state": state.value, "data": data}
        await cache.set(self.cache_key, json.dumps(payload), ttl=600)

    async def clear_state(self):
        """Clear state to reset workflow."""
        await cache.delete(self.cache_key)

    async def process_message(self, message: str) -> Optional[str]:
        """
        Process user message and return Agent response.
        Returns None if workflow decides to pass control back to general chat.
        """
        # 1. Load State
        state_data = await self.get_state()
        current_state = CampaignState(state_data.get("state", "IDLE"))
        campaign_data = state_data.get("data", {})
        
        cleaned_msg = message.strip().lower()

        # 2. Global Cancel/Reset
        if cleaned_msg in ["cancel", "stop", "reset", "quit"]:
            await self.clear_state()
            return "Campaign creation cancelled. How else can I help you?"

        # 3. State Machine
        if current_state == CampaignState.IDLE:
            if any(x in cleaned_msg for x in ["create campaign", "new campaign", "start campaign"]):
                await self.update_state(CampaignState.ASK_NAME, {})
                return "I can help you create a new campaign. First, what should we verify as the **Campaign Name**?"
            return None 

        # --- Active Workflow ---

        if current_state == CampaignState.ASK_NAME:
            campaign_data["name"] = message.strip()
            await self.update_state(CampaignState.ASK_TYPE, campaign_data)
            return f"Great, name set to '{campaign_data['name']}'.\n\nWhat is the **Campaign Type**? (e.g., 'Outreach', 'Newsletter', 'Event')"

        if current_state == CampaignState.ASK_TYPE:
            campaign_data["type"] = message.strip()
            await self.update_state(CampaignState.ASK_AUDIENCE, campaign_data)
            return "Got it. **Who is the target audience**? (e.g., 'All Candidates', 'Computer Science Students')"

        if current_state == CampaignState.ASK_AUDIENCE:
            campaign_data["target_audience"] = message.strip()
            await self.update_state(CampaignState.ASK_INSTRUCTIONS, campaign_data)
            return "Understood. Now, please provide the **AI Instructions** for the content. What is the goal of this campaign and what should the message say?"

        if current_state == CampaignState.ASK_INSTRUCTIONS:
            campaign_data["goal"] = message.strip()
            
            # Generate a Preview
            summary = (
                f"**Verification**\n"
                f"- **Name**: {campaign_data.get('name')}\n"
                f"- **Type**: {campaign_data.get('type')}\n"
                f"- **Audience**: {campaign_data.get('target_audience')}\n"
                f"- **Goal**: {campaign_data.get('goal')}\n\n"
                f"Shall I create this campaign now? (Yes/No)"
            )
            
            await self.update_state(CampaignState.CONFIRM, campaign_data)
            return summary

        if current_state == CampaignState.CONFIRM:
            if cleaned_msg.startswith("y"):
                # EXECUTE CREATION -> Transition to ASK_UPLOAD instead of clearing
                await self.update_state(CampaignState.CREATING, campaign_data)
                result_msg, campaign_id = await self._create_campaign_in_db(campaign_data)
                
                if campaign_id:
                    campaign_data["id"] = campaign_id # Store ID for next steps
                    await self.update_state(CampaignState.ASK_UPLOAD, campaign_data)
                    return f"{result_msg}\n\n**Would you like to upload candidates to this campaign now?** (Yes/No)"
                else:
                    await self.clear_state() # Fail safe
                    return result_msg
            else:
                await self.update_state(CampaignState.ASK_NAME, {}) 
                return "Cancelled. Let's start over. What is the **Campaign Name**? (Or type 'cancel' to exit)"
        
        # --- Post-Creation Candidate Upload States ---
        
        if current_state == CampaignState.ASK_UPLOAD:
            if cleaned_msg.startswith("y"):
                await self.update_state(CampaignState.ASK_CANDIDATE_DETAILS, campaign_data)
                return (
                    "Please paste candidate details below.\n"
                    "Format: **Name, Email, Phone** (separators like comma or space work).\n"
                    "Example: *John Doe, john@example.com, 555-0100*\n\n"
                    "Type 'Done' when you are finished."
                )
            else:
                await self.clear_state()
                return "No problem. You can add candidates later from the dashboard. Anything else I can help with?"

        if current_state == CampaignState.ASK_CANDIDATE_DETAILS:
            if cleaned_msg == "done":
                await self.clear_state()
                return f"✅ Candidate upload finished for campaign **{campaign_data.get('name')}**. Launch execution from the dashboard when ready!"
            
            # Parse and Add Candidate
            result_msg = await self._parse_and_add_candidate(message, campaign_data.get("id"))
            return f"{result_msg}\n\n*Add another or type 'Done'.*"

        return None

    async def _create_campaign_in_db(self, data: Dict[str, Any]) -> tuple[str, Optional[str]]:
        try:
            # 1. Run Strategy Generation
            plan_result = "AI Plan Pending"
            try:
                crew = CampaignAgno(data["goal"])
                plan_res = crew.plan_campaign()
                plan_result = str(plan_res)
            except Exception as e:
                logger.error(f"AI Plan failed: {e}")
            
            # 2. DB Insert
            db_payload = {
                "user_id": self.user_id,
                "name": data["name"],
                "goal": data["goal"],
                "status": "draft",
                "type": "personalized", 
                "channels": ["email", "whatsapp"], 
                "messages_sent": 0,
                "metadata": {
                    "ai_plan": plan_result, 
                    "ai_prompt": data["goal"], 
                    "target_audience": data["target_audience"],
                    "campaign_type": data.get("type")
                }
            }
            
            res = supabase.table("campaigns").insert(db_payload).execute()
            
            if res.data:
                campaign = res.data[0]
                return (f"✅ **Campaign '{data['name']}' Created!**", campaign['id'])
            else:
                return ("❌ Failed to create campaign in database.", None)

        except Exception as e:
            logger.error(f"Campaign DB Creation Error: {e}")
            return (f"Error creating campaign: {str(e)}", None)

    async def _parse_and_add_candidate(self, text: str, campaign_id: str) -> str:
        """
        Heuristic parsing of One-line candidate string.
        Looks for Email, Phone, Name.
        """
        if not campaign_id:
            return "Error: Campaign ID missing."

        text = text.strip()
        
        # 1. Extract Email
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        email = email_match.group(0) if email_match else ""
        
        # 2. Extract Phone (Simple digit check)
        # Matches sequences of 10-15 digits, allowing for + and spaces
        phone_match = re.search(r'\+?\d[\d\s-]{8,15}\d', text)
        phone = phone_match.group(0) if phone_match else "" # Note might capture partial numbers if strict regex not used
        
        # 3. Extract Name (Whatever is left)
        # Remove email and phone from text to find name
        remains = text
        if email: remains = remains.replace(email, "")
        if phone: remains = remains.replace(phone, "")
        
        # Clean up separators
        name = re.sub(r'[,;\|\t]', ' ', remains).strip()
        # Remove extra spaces
        name = re.sub(r'\s+', ' ', name)
        
        if not name or len(name) < 2:
            name = "Unknown Candidate"

        if not email and not phone:
            return "⚠️ Could not detect a valid Email or Phone. Please try again (e.g. *Name, Email*)."

        # DB Insert
        try:
            payload = {
                "user_id": self.user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "tags": ["uploaded", f"campaign:{campaign_id}"],
                "status": "pending"
            }
            supabase.table("candidates").insert(payload).execute()
            
            # Update Campaign Count (Best effort)
            try:
                # Optimized RPC call is better, but here we do simple fetch-update for now O(1)
                pass # Skipping complex update for speed in chat
            except: pass
            
            details = []
            if name: details.append(name)
            if email: details.append(email)
            if phone: details.append(phone)
            
            return f"✅ Added: **{', '.join(details)}**"
            
        except Exception as e:
            logger.error(f"Candidate Add Failed: {e}")
            return "❌ Failed to save candidate. Please try again."
