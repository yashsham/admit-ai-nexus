from app.data.supabase_client import supabase
import uuid

# Mock Data matching campaigns.py
data = {
    "user_id": "test_user_DEBUG", # This might fail if user_id is a foreign key to auth.users
    "name": "Debug Campaign",
    "goal": "Debug Insertion",
    "status": "active",
    "type": "personalized", 
    "channels": ["email", "whatsapp"], 
    "messages_sent": 0,
    "metadata": {"ai_plan": "Test Plan", "ai_prompt": "Test Prompt"}
}

try:
    print("Attempting Insert...")
    # NOTE: Assuming user_id FK might be an issue, we'll try to find a real user first or allow failure to see the message.
    
    print("Attempting Insert with Dummy UUID...")
    data["user_id"] = "00000000-0000-0000-0000-000000000000" # Dummy UUID for schema testing
    
    res = supabase.table("campaigns").insert(data).execute()
    print("SUCCESS:", res.data)
except Exception as e:
    print("\nFAILED")
    print(f"Error Type: {type(e)}")
    print(f"Error Args: {e.args}")
    # Inspect exception deeper if possible
    if hasattr(e, 'response'):
        print(f"Response: {e.response}")
    if hasattr(e, 'code'):
         print(f"Code: {e.code}")
    if hasattr(e, 'details'):
         print(f"Details: {e.details}")
    if hasattr(e, 'message'):
         print(f"Message: {e.message}")
