from phi.agent import Agent
from app.core.config import settings
from app.ai.models.agent_factory import get_model_priority as get_model

def get_auto_reply_agent() -> Agent:
    """
    Returns an Agent specialized in classifying and responding to candidate messages.
    """
    instructions = [
        "You are an admission assistant for a college.",
        "Your goal is to classify the user's incoming message intent.",
        "Output JSON ONLY with keys: 'classification' (Interested, Not Interested, Question, Spam), 'suggested_reply' (string), 'alert_needed' (boolean).",
        "If they are interested, be warm and ask for a good time to call.",
        "If they have a question, answer it briefly based on general college admission knowledge."
    ]
    
    return Agent(
        model=get_model(),
        description="Auto-Reply Admission Bot",
        instructions=instructions,
        markdown=True,
        show_tool_calls=False
        # structured_outputs=True # If supported by model, or just prompt engineering
    )

def process_inbound_message(sender_id: str, message_text: str, source: str = "whatsapp"):
    """
    Process inbound message, classify, reply, and update DB.
    """
    print(f"Processing inbound from {sender_id} via {source}: {message_text}")
    
    agent = get_auto_reply_agent()
    
    prompt = f"Sender: {sender_id}\nSource: {source}\nMessage: {message_text}\n\nClassify and Reply."
    try:
        response = agent.run(prompt)
    except Exception as e:
        print(f"LLM Agent Error: {e}")
        return

    # Parse JSON (Agent output might need cleaning)
    content = response.content
    import json
    import re
    
    try:
        # Extract JSON if wrapped in markdown
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            data = json.loads(content)
            
        cls = data.get("classification", "Unknown")
        reply = data.get("suggested_reply", "")
        alert = data.get("alert_needed", False)
        
        print(f"Classification: {cls} | Alert: {alert}")
        
        # 1. Store in DB (candidates table or messages table)
        from app.data.supabase_client import supabase
        
        # Try to find candidate by phone/email (sender_id)
        col = "phone" if source == "whatsapp" else "email"
        
        # Update connection status/metadata
        # Update connection status/metadata
        try:
            update_data = {"last_reply_at": "now()"}
            
            # Fetch current candidate to get tags
            current = supabase.table("candidates").select("tags").eq(col, sender_id).maybe_single().execute()
            
            if current and cls == "Interested":
                current_tags = current.data.get("tags") or []
                if isinstance(current_tags, str): # Handle legacy string tags if any
                    current_tags = [current_tags]
                
                if "interested" not in current_tags:
                    current_tags.append("interested")
                    update_data["tags"] = current_tags

            # Use 'ilike' for email case insensitivity if possible, or just exact match
            res = supabase.table("candidates").update(update_data).eq(col, sender_id).execute()
            if not res.data:
                print(f"Warning: Candidate not found for {col}={sender_id}")
        except Exception as db_e:
            print(f"DB Update Error: {db_e}")

        # 2. Send Reply
        if reply:
            if source == "whatsapp":
                from app.ai.tools.tools import send_whatsapp_message
                send_whatsapp_message(sender_id, reply)
            elif source == "email":
                from app.ai.tools.tools import send_email
                # We need a subject line. Agent didn't provide one, so we default.
                send_email(
                    to_email=sender_id, 
                    subject="Re: Your Inquiry - AdmitConnect", 
                    content=reply,
                    user_id="auto-reply" # Use a system user or appropriate context
                )
             
    except Exception as e:
        print(f"Auto-Reply Processing Error: {e}")

