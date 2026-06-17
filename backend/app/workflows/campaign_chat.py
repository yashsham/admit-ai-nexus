import json
from typing import Optional, Dict, Any, TypedDict, Annotated, List
from langgraph.graph import StateGraph, END
from app.core.cache import cache
from app.data.supabase_client import supabase
from app.workflows.campaign_agno import CampaignAgno
import logging
import re

logger = logging.getLogger("workflow.campaign_chat")

# --- Agent State Definition ---

class CampaignAgentState(TypedDict):
    """
    Explicit State for the Campaign Creation Graph.
    This dictates exactly what data is available at each node.
    """
    messages: List[str] # History of messages in this session
    next_step: str      # The current active node/step name
    user_id: str
    campaign_data: Dict[str, Any] # Accumulates: name, type, audience, goal, id, etc.
    last_ai_response: Optional[str] # Message to show user
    candidate_list: Optional[List[Dict]] # For displaying options

# --- Nodes (Explicit Steps) ---

def node_router(state: CampaignAgentState) -> CampaignAgentState:
    """
    Determines the next step based on the current 'next_step' pointer.
    Acts as the entry point or 'controller'.
    """
    # Simply passes through; the graph edges handle the routing logic.
    return state

async def node_ask_select_campaign(state: CampaignAgentState) -> CampaignAgentState:
    # Fetch recent campaigns
    user_id = state["user_id"]
    try:
        res = supabase.table("campaigns").select("id, name, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
        campaigns = res.data or []
        
        if not campaigns:
            state["last_ai_response"] = "You don't have any campaigns yet. Type 'create campaign' to start one!"
            state["next_step"] = "idle"
            return state

        campaign_list_txt = ""
        state["candidate_list"] = campaigns # abuse this field to store raw options temporarily
        
        for idx, c in enumerate(campaigns):
            campaign_list_txt += f"{idx+1}. **{c['name']}**\n"
            
        state["last_ai_response"] = f"Which campaign would you like to add candidates to? (Type the number)\n\n{campaign_list_txt}"
        state["next_step"] = "wait_for_campaign_selection"
        
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        state["last_ai_response"] = "Error fetching your campaigns."
        state["next_step"] = "idle"
        
    return state

def node_process_campaign_selection(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1].strip()
    campaigns = state.get("candidate_list", []) # Retrieved from previous step
    
    selected_campaign = None
    
    # Try parsing number
    if user_msg.isdigit():
        idx = int(user_msg) - 1
        if 0 <= idx < len(campaigns):
            selected_campaign = campaigns[idx]
    
    # Try text match
    if not selected_campaign:
        for c in campaigns:
            if c['name'].lower() in user_msg.lower():
                selected_campaign = c
                break
                
    if selected_campaign:
        state["campaign_data"]["id"] = selected_campaign["id"]
        state["campaign_data"]["name"] = selected_campaign["name"]
        
        state["last_ai_response"] = (
            f"Selected **{selected_campaign['name']}**.\n\n"
            "Please paste candidate details below.\n"
            "Format: **Name, Email, Phone**\n"
            "Type 'Done' when finished."
        )
        state["next_step"] = "wait_for_candidate"
    else:
        state["last_ai_response"] = "I couldn't find that campaign. Please try again or type 'cancel'."
        state["next_step"] = "wait_for_campaign_selection" # Loop
        
    return state

def node_ask_name(state: CampaignAgentState) -> CampaignAgentState:
    state["last_ai_response"] = "I can help you create a new campaign. First, what should we verify as the **Campaign Name**?"
    state["next_step"] = "wait_for_name"
    return state

def node_save_name(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1]
    cleaned = user_msg.strip()
    
    if cleaned.lower() in ["cancel", "stop"]:
        state["next_step"] = "cancel"
        return state

    state["campaign_data"]["name"] = cleaned
    state["last_ai_response"] = f"Great, name set to '{cleaned}'.\n\nWhat is the **Campaign Type**? (e.g., 'Outreach', 'Newsletter', 'Event')"
    state["next_step"] = "wait_for_type"
    return state

def node_save_type(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1]
    state["campaign_data"]["type"] = user_msg.strip()
    state["last_ai_response"] = "Got it. **Who is the target audience**? (e.g., 'All Candidates', 'Computer Science Students')"
    state["next_step"] = "wait_for_audience"
    return state

def node_save_audience(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1]
    state["campaign_data"]["target_audience"] = user_msg.strip()
    state["last_ai_response"] = "Understood. Now, please provide the **AI Instructions**. What is the goal of this campaign and what should the message say?"
    state["next_step"] = "wait_for_goal"
    return state

def node_save_goal_and_confirm(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1]
    state["campaign_data"]["goal"] = user_msg.strip()
    
    # Generate Preview
    data = state["campaign_data"]
    summary = (
        f"**Verification**\n"
        f"- **Name**: {data.get('name')}\n"
        f"- **Type**: {data.get('type')}\n"
        f"- **Audience**: {data.get('target_audience')}\n"
        f"- **Goal**: {data.get('goal')}\n\n"
        f"Shall I create this campaign now? (Yes/No)"
    )
    state["last_ai_response"] = summary
    state["next_step"] = "wait_for_confirm"
    return state

async def node_create_campaign(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1].lower()
    
    if user_msg.startswith("y"):
        # Explicit Logic to Create in DB
        result_msg, campaign_id = await _create_campaign_in_db(state["user_id"], state["campaign_data"])
        
        if campaign_id:
            state["campaign_data"]["id"] = campaign_id
            state["last_ai_response"] = f"{result_msg}\n\n**Would you like to upload candidates to this campaign now?** (Yes/No)"
            state["next_step"] = "wait_for_upload_decision"
        else:
            state["last_ai_response"] = f"{result_msg}\nPlease start over."
            state["next_step"] = "idle" # Reset
    else:
        state["last_ai_response"] = "Cancelled. Let's start over. What is the **Campaign Name**?"
        state["next_step"] = "wait_for_name" # Loop back
        state["campaign_data"] = {} # Clear data

    return state

def node_upload_decision(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1].lower()
    if user_msg.startswith("y"):
        state["last_ai_response"] = (
            "Please paste candidate details below.\n"
            "Format: **Name, Email, Phone** (separators like comma or space work).\n"
            "Example: *John Doe, john@example.com, 555-0100*\n\n"
            "Type 'Done' when you are finished."
        )
        state["next_step"] = "wait_for_candidate"
    else:
        state["last_ai_response"] = "No problem. You can add candidates later from the dashboard. Anything else I can help with?"
        state["next_step"] = "idle"
    return state

async def node_process_candidate(state: CampaignAgentState) -> CampaignAgentState:
    user_msg = state["messages"][-1]
    
    if user_msg.strip().lower() == "done":
        name = state["campaign_data"].get("name", "campaign")
        state["last_ai_response"] = f"✅ Candidate upload finished for **{name}**. Launch execution from the dashboard when ready!"
        state["next_step"] = "idle"
        return state

    # Parse and Add
    cid = state["campaign_data"].get("id")
    result_msg = await _parse_and_add_candidate(user_msg, cid, state["user_id"])
    
    state["last_ai_response"] = f"{result_msg}\n\n*Add another or type 'Done'.*"
    state["next_step"] = "wait_for_candidate" # Loop
    return state

def node_cancel(state: CampaignAgentState) -> CampaignAgentState:
    state["last_ai_response"] = "Campaign creation cancelled. How else can I help?"
    state["next_step"] = "idle"
    state["campaign_data"] = {}
    return state

# --- Helpers ---

async def _create_campaign_in_db(user_id: str, data: Dict[str, Any]) -> tuple[str, Optional[str]]:
    try:
        # 1. Run Strategy Generation (Optional, can be async backgrounded if slow)
        plan_result = "AI Plan Pending"
        try:
            crew = CampaignAgno(data["goal"])
            plan_res = crew.plan_campaign()
            plan_result = str(plan_res)
        except Exception as e:
            logger.error(f"AI Plan failed: {e}")
        
        # 2. DB Insert
        db_payload = {
            "user_id": user_id,
            "name": data["name"],
            "goal": data["goal"],
            "status": "draft",
            "type": "personalized", 
            "channels": ["email", "whatsapp"] + (["voice"] if "voice" in data.get("type", "").lower() else []), 
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

async def _parse_and_add_candidate(text: str, campaign_id: str, user_id: str) -> str:
    if not campaign_id:
        return "Error: Campaign ID missing."

    text = text.strip()
    
    # 1. Extract Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else ""
    
    # 2. Extract Phone
    phone_match = re.search(r'\+?\d[\d\s-]{8,15}\d', text)
    phone = phone_match.group(0) if phone_match else ""
    
    # 3. Extract Name
    remains = text
    if email: remains = remains.replace(email, "")
    if phone: remains = remains.replace(phone, "")
    
    name = re.sub(r'[,;\|\t]', ' ', remains).strip()
    name = re.sub(r'\s+', ' ', name)
    
    if not name or len(name) < 2:
        name = "Unknown Candidate"

    if not email and not phone:
        return "⚠️ Could not detect a valid Email or Phone. Format: *Name, Email, Phone*"

    try:
        payload = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "tags": ["uploaded", f"campaign:{campaign_id}"]
        }
        supabase.table("candidates").insert(payload).execute()
        
        details = []
        if name: details.append(name)
        if email: details.append(email)
        if phone: details.append(phone)
        
        return f"✅ Added: **{', '.join(details)}**"
        
    except Exception as e:
        logger.error(f"Candidate Add Failed: {e}")
        return "❌ Failed to save candidate. Please try again."

# --- Graph Construction ---

def build_campaign_graph():
    builder = StateGraph(CampaignAgentState)
    
    # Add Nodes
    builder.add_node("router", node_router)
    builder.add_node("ask_select_campaign", node_ask_select_campaign)
    builder.add_node("process_campaign_selection", node_process_campaign_selection)
    builder.add_node("ask_name", node_ask_name)
    builder.add_node("save_name", node_save_name)
    builder.add_node("save_type", node_save_type)
    builder.add_node("save_audience", node_save_audience)
    builder.add_node("save_goal_and_confirm", node_save_goal_and_confirm)
    builder.add_node("create_campaign", node_create_campaign)
    builder.add_node("upload_decision", node_upload_decision)
    builder.add_node("process_candidate", node_process_candidate)
    builder.add_node("cancel", node_cancel)
    
    # Add Edges
    # The 'router' decides where to go based on 'next_step' in state (loaded from Redis)
    def route_step(state: CampaignAgentState):
        step = state.get("next_step", "idle")
        
        # User meant to start?
        last_msg = state.get("messages", [])[-1].lower() if state.get("messages") else ""
        if step == "idle":
            if any(x in last_msg for x in ["create campaign", "new campaign", "start campaign"]):
                return "ask_name"
            if any(x in last_msg for x in ["upload", "add candidate", "import candidates"]):
                return "ask_select_campaign"
            return END
            
        if step == "wait_for_name": return "save_name"
        if step == "wait_for_type": return "save_type"
        if step == "wait_for_audience": return "save_audience"
        if step == "wait_for_goal": return "save_goal_and_confirm"
        if step == "wait_for_confirm": return "create_campaign"
        if step == "wait_for_upload_decision": return "upload_decision"
        if step == "wait_for_candidate": return "process_candidate"
        if step == "wait_for_campaign_selection": return "process_campaign_selection"
        if step == "cancel": return "cancel"
        
        return END

    builder.set_entry_point("router")
    
    builder.add_conditional_edges(
        "router",
        route_step
    )
    
    # After each 'save' or 'process' node, we stop to wait for user input.
    # We implicitly stop because the next tool call is a user response.
    # In LangGraph terms for a chatbot, we often loop, but here we process ONE message at a time.
    # So each node naturally leads to END (awaiting next HTTP request).
    
    builder.add_edge("ask_select_campaign", END)
    builder.add_edge("process_campaign_selection", END)
    builder.add_edge("ask_name", END)
    builder.add_edge("save_name", END)
    builder.add_edge("save_type", END)
    builder.add_edge("save_audience", END)
    builder.add_edge("save_goal_and_confirm", END)
    builder.add_edge("create_campaign", END)
    builder.add_edge("upload_decision", END)
    builder.add_edge("process_candidate", END)
    builder.add_edge("cancel", END)

    return builder.compile()

# Global Compiled Graph
campaign_graph = build_campaign_graph()

class CampaignChatWorkflow:
    """
    Wrapper around LangGraph to interface with existing Redis/App Logic.
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_key = f"campaign_chat:{user_id}"

    async def get_state(self) -> CampaignAgentState:
        data = await cache.get(self.cache_key)
        if data:
            return json.loads(data)
        return {
            "messages": [],
            "next_step": "idle",
            "user_id": self.user_id,
            "campaign_data": {},
            "last_ai_response": None
        }

    async def save_state(self, state: CampaignAgentState):
        await cache.set(self.cache_key, json.dumps(state), ttl=600)

    async def clear_state(self):
        await cache.delete(self.cache_key)

    async def process_message(self, message: str) -> Optional[str]:
        # 1. Load context
        state = await self.get_state()
        
        # 2. Append incoming message
        state["messages"].append(message)
        state["user_id"] = self.user_id # Ensure ID is set
        
        # 3. Global Reset Check
        if message.strip().lower() in ["cancel", "stop", "reset", "quit"]:
             state["next_step"] = "cancel"

        # 4. Invoke Graph
        # We pass the full state. The graph will determine logic.
        result = await campaign_graph.ainvoke(state)
        
        # 5. Save Resulting State
        # The result from invoke is the final state after the graph run (one step)
        final_state = result
        await self.save_state(final_state)
        
        # 6. Return standard response if a new one was generated
        if final_state["last_ai_response"] != state["last_ai_response"]:
             return final_state["last_ai_response"]
             
        # If 'ask_name' set the response, it will differ from initial state (None)
        if final_state["last_ai_response"]:
            return final_state["last_ai_response"]

        return None
