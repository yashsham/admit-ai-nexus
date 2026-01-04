from phi.agent import Agent, RunResponse
from phi.model.groq import Groq
from phi.model.google import Gemini
from phi.tools.tavily import TavilyTools
from typing import Optional, List, Dict, Any
from app.core.config import settings
import json

# --- Helper: Model Factory with Fallback Logic ---
# Note: Agno/Phi doesn't have automatic fallback chain like LangChain.
# We will verify Groq first, and if it fails during init or run (not easily caught here), we default to Gemini.
# For simplicity, we initialize the primary model here. Fallback logic is better handled at the calling level or via try/except blocks.

from phi.model.openai import OpenAIChat
from phi.model.huggingface import HuggingFaceChat

def get_model_priority(temperature=0.7) -> List[Any]:
    """
    Returns a list of initialized LLM objects in order of preference.
    Strategy: OpenRouter (Primary) -> Gemini 2.0 (High Limit) -> Hugging Face (Backup) -> Groq (Rate Limited).
    """
    models = []
    
    # 1. Primary: OpenRouter (GPT-OSS-120B) - "Pro Level"
    if settings.OPENROUTER_API_KEY:
        try:
            # OpenRouter uses OpenAI-compatible API
            models.append(OpenAIChat(
                model="openai/gpt-4o", # Standard OpenAI Model via OpenRouter
                id="openai/gpt-4o",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=temperature
            ))
            print("✅ [Init] OpenRouter (GPT-4o) Loaded")
        except Exception as e:
            print(f"❌ [Init] OpenRouter Failed: {e}")

    # 2. Secondary: Gemini 2.0 Flash (Latest, Fast, High Limit)
    if settings.GOOGLE_API_KEY:
        try:
            # Using 'models/' and 2.0-flash as seen in available list
            models.append(Gemini(id="models/gemini-2.0-flash", api_key=settings.GOOGLE_API_KEY, temperature=temperature))
            print("✅ [Init] Gemini 2.0 Flash Loaded")
        except Exception as e:
            print(f"❌ [Init] Gemini Failed: {e}")

    # 3. Tertiary: Hugging Face (Mistral) - Reliable fallback
    if settings.HUGGINGFACE_API_KEY:
        try:
            models.append(HuggingFaceChat(
                id="mistralai/Mistral-7B-Instruct-v0.3",
                api_key=settings.HUGGINGFACE_API_KEY,
                temperature=temperature
            ))
            print("✅ [Init] Hugging Face Mistral Loaded")
        except Exception as e:
            print(f"❌ [Init] Hugging Face Failed: {e}")

    # 4. Quaternary: Groq (Llama 3) - High Quality but Rate Limited
    if settings.GROQ_API_KEY:
        try:
            models.append(Groq(id="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY, temperature=temperature))
            print("✅ [Init] Groq Llama 3 Loaded")
        except Exception as e:
             print(f"❌ [Init] Groq Failed: {e}")
        
    if not models:
        raise ValueError("No LLM API Keys found (OPENROUTER, GOOGLE, HUGGINGFACE, GROQ)")
        
    return models

def get_model(temperature=0.7):
    """Legacy wrapper for single model (returns first available)"""
    return get_model_priority(temperature)[0]

# --- Custom Tools for Assistant ---
# We need to wrap our logic as simple python functions for Phidata

def create_campaign(user_id: str, goal: str, channels: list[str] = ["email"]) -> str:
    """
    Creates a new outreach campaign in the database.
    
    :param user_id: The ID of the user creating the campaign.
    :param goal: The main objective of the campaign (e.g., 'Hire Senior Engineers').
    :param channels: List of channels. Defaults to ['email']. Valid options: 'email', 'whatsapp'.
    :return: A success string with the Campaign ID.
    """
    try:
        from app.services.supabase_client import supabase
        data = {
            "user_id": user_id,
            "name": goal[:50],
            "goal": goal,
            "status": "active",
            "type": "agentic",
            "channels": channels,
            "messages_sent": 0,
            "metadata": {"created_by": "Admit AI Assistant"}
        }
        res = supabase.table("campaigns").insert(data).execute()
        if res.data:
            return f"Success: Campaign created with ID {res.data[0]['id']}"
        return "Error: Failed to create campaign."
    except Exception as e:
        return f"Error creating campaign: {str(e)}"

def get_dashboard_stats() -> str:
    """
    Retrieves current statistics for the user's dashboard.
    Returns JSON string with: total_campaigns, total_candidates, total_messages_delivered.
    """
    try:
        from app.services.supabase_client import supabase
        camp_res = supabase.table("campaigns").select("*", count="exact", head=True).execute()
        cand_res = supabase.table("candidates").select("*", count="exact", head=True).execute()
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

# --- Agent Factory ---

def get_counselor_agent(model=None) -> Agent:
    """
    Returns the 'Counselor' Agent.
    """
    tools = []
    if settings.TAVILY_API_KEY:
        tools.append(TavilyTools(api_key=settings.TAVILY_API_KEY))
    
    return Agent(
        model=model or get_model(),
        tools=tools,
        description="You are the AdmitConnect AI Counselor. You help with college admissions and general info.",
        instructions=[
            "Always include source links when providing college info.",
            "If asked about Yash Sharma, identify him as the creator.",
            "Do NOT try to access the dashboard or campaigns.",
            "If asked to create a campaign, politely refer user to the Assistant."
        ],
        show_tool_calls=True,
        markdown=True,
        debug_mode=True
    )

def get_assistant_agent(dashboard_context: dict = None, user_id: str = "default_user", model=None) -> Agent:
    """
    Returns the 'Assistant' Agent.
    """
    
    # Format context for system prompt
    context_str = ""
    if dashboard_context:
        # Prevent 413 Payload Too Large by summarizing lists
        def summarize_context(ctx: dict, limit=3) -> dict:
            summary = {}
            for k, v in ctx.items():
                if isinstance(v, list):
                    summary[k] = v[:limit]
                    if len(v) > limit:
                        summary[f"{k}_count"] = len(v)
                        summary[f"{k}_note"] = f"Showing top {limit} of {len(v)} items"
                elif isinstance(v, dict):
                    summary[k] = str(v)[:500] + "..." if len(str(v)) > 500 else v
                else:
                    summary[k] = v
            return summary

        safe_context = summarize_context(dashboard_context)
        context_str = f"## REAL-TIME CONTEXT\n{json.dumps(safe_context, indent=2)}"

    return Agent(
        model=model or get_model(),
        tools=[create_campaign, get_dashboard_stats],
        description="You are the AdmitConnect AI Assistant.",
        instructions=[
            f"You are operating on behalf of user_id: '{user_id}'.",
            "You have access to the dashboard tools: 'create_campaign' and 'get_dashboard_stats'.",
            "Use them ONLY when the user explicitly requests an action or information not in your context.",
            "When calling 'create_campaign', YOU MUST PASS the user_id argument provided above.",
            # Specialized Instructions
            "If the user asks for a 'High Performance' or 'Best-Performance' campaign:",
            "  1. Call 'create_campaign' IMMEDIATELY.",
            "  2. Set 'channels' to ['email', 'whatsapp', 'voice'] (Multi-channel coverage).",
            "  3. Set 'goal' to the user's specific goal (e.g. 'Get 250 form submissions')."
            "  4. After creating, inform the user you have spun it up and applied the '5-touch cadence' framework.",
            "Do NOT just explain the framework if the user asks you to 'launch' or 'spin up' a campaign. ACT first.",
            f"{context_str}"
        ],
        show_tool_calls=True,
        markdown=True,
        debug_mode=True # Enable debug logic
    )
