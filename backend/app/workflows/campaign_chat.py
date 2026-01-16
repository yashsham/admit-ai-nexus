import json
from enum import Enum
from typing import Optional, Dict, Any
from app.core.cache import cache
from app.data.supabase_client import supabase
from app.workflows.campaign_agno import CampaignAgno
import logging

logger = logging.getLogger("workflow.campaign_chat")

class CampaignState(str, Enum):
    IDLE = "IDLE"
    ASK_NAME = "ASK_NAME"
    ASK_TYPE = "ASK_TYPE"
    ASK_AUDIENCE = "ASK_AUDIENCE"
    ASK_INSTRUCTIONS = "ASK_INSTRUCTIONS"
    CONFIRM = "CONFIRM"
    CREATING = "CREATING"

class CampaignChatWorkflow:
    """
    Stateful workflow for creating campaigns via chat.
    Uses Redis to persist state between requests.
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
            # Check intent (this matches rudimentary "create campaign" phrases)
            # In a real agent, the router would detect intent and call this.
            # Here we assume the Router called us because it detected intent OR we are already active.
            # But since IDLE is default, we only start if explicitly asked.
            if any(x in cleaned_msg for x in ["create campaign", "new campaign", "start campaign"]):
                await self.update_state(CampaignState.ASK_NAME, {})
                return "I can help you create a new campaign. First, what should we verify as the **Campaign Name**?"
            return None # Not relevant, pass to general LLM

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
                # EXECUTE CREATION
                await self.update_state(CampaignState.CREATING, campaign_data)
                return await self._create_campaign_in_db(campaign_data)
            else:
                # Loop back or cancel? Let's ask what to change or just cancel.
                await self.update_state(CampaignState.ASK_NAME, {}) # Restart? Or just cancel.
                return "Cancelled. Let's start over. What is the **Campaign Name**? (Or type 'cancel' to exit)"

        return None

    async def _create_campaign_in_db(self, data: Dict[str, Any]) -> str:
        try:
            # 1. Run Strategy Generation (Optional, can be async)
            plan_result = "AI Plan Pending"
            try:
                crew = CampaignAgno(data["goal"])
                # We do this synchronously here to show immediate value, 
                # but might verify timeout if it takes too long.
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
                # Map specific fields if needed
                "type": "personalized", 
                "channels": ["email", "whatsapp"], # Default for now
                "messages_sent": 0,
                "metadata": {
                    "ai_plan": plan_result, 
                    "ai_prompt": data["goal"], 
                    "target_audience": data["target_audience"],
                    "campaign_type": data.get("type")
                }
            }
            
            res = supabase.table("campaigns").insert(db_payload).execute()
            
            # Clear state
            await self.clear_state()
            
            if res.data:
                return f"✅ **Campaign Created Successfully!**\n\nYou can view '{data['name']}' in your dashboard."
            else:
                return "❌ Failed to create campaign in database."

        except Exception as e:
            logger.error(f"Campaign DB Creation Error: {e}")
            return f"Error creating campaign: {str(e)}"
