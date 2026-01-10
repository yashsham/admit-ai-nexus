from langchain_core.tools import tool
from app.data.supabase_client import supabase
from pydantic import BaseModel, Field
from typing import List, Optional
import json

# Input Schemas
class CreateCampaignInput(BaseModel):
    goal: str = Field(..., description="The main goal of the campaign (e.g., 'Hire Senior Engineers')")
    channels: List[str] = Field(default=["email"], description="List of channels to use (e.g., ['email', 'whatsapp'])")

# Tools with DSA Optimizations (O(1) Memory for aggregation)

@tool(args_schema=CreateCampaignInput)
def create_campaign_tool(goal: str, channels: List[str] = ["email"]):
    """
    Creates a new outreach campaign with the specified goal and channels.
    Use this when the user explicitly asks to 'create a campaign' or 'start a new outreach'.
    Returns the ID of the created campaign.
    """
    try:
        # DB O(1) Insertion
        data = {
            "user_id": "auto-agent", # Default for agent actions
            "name": goal[:50],
            "goal": goal,
            "status": "active",
            "type": "agentic",
            "channels": channels,
            "messages_sent": 0,
            "metadata": {"created_by": "Agentic AI"}
        }
        res = supabase.table("campaigns").insert(data).execute()
        if res.data:
            return f"Success: Campaign created with ID {res.data[0]['id']}"
        return "Error: Failed to create campaign."
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_db_stats_tool():
    """
    Fetches real-time statistics about the system (Campaigns, Candidates, Automations).
    Use this when the user asks for 'stats', 'numbers', or 'overview'.
    """
    try:
        # DSA Optimization: Use count='exact' to let DB do the work (O(1) application memory)
        # Instead of fetching rows (O(N)), we just fetch the integer count.
        
        camp_res = supabase.table("campaigns").select("*", count="exact", head=True).execute()
        cand_res = supabase.table("candidates").select("*", count="exact", head=True).execute()
        
        # For specific aggregation (e.g. messages sent), we still need to sum.
        # Ideally we'd use a Postgres function (RPC), but for now we'll do a optimized fetch.
        # We only fetch the specific column needed for summing, not distinct rows.
        msg_res = supabase.table("campaigns").select("messages_sent").execute()
        total_active_msg = sum([x.get('messages_sent', 0) for x in msg_res.data or []])

        stats = {
            "total_campaigns": camp_res.count,
            "total_candidates": cand_res.count,
            "total_messages_delivered": total_active_msg
        }
        return json.dumps(stats)
    except Exception as e:
        return f"Error fetching stats: {str(e)}"

AGENT_TOOLS = [create_campaign_tool, get_db_stats_tool]
