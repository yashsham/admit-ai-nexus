from fastapi import HTTPException, Request, Depends
from app.services.supabase_client import supabase
from datetime import datetime, timezone

# Constants
FREE_USAGE_LIMIT = 1000  # Increased limit for testing
LOCK_MESSAGE = "You have reached your free daily usage limit. Please subscribe to continue using AdmitConnect AI."

def get_client_ip(request: Request) -> str:
    """Helper to extract Client IP from request headers"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host

async def verify_usage_limit(request: Request):
    """
    Dependency to check if the user has exceeded their usage limit.
    Uses 'user_usage' table in Supabase.
    Schema expected:
      - id (int/uuid)
      - ip_address (text)
      - user_email (text, optional)
      - date (date)
      - count (int)
    """
    ip = get_client_ip(request)
    today = datetime.now(timezone.utc).date().isoformat()
    
    # 1. Check existing usage for this IP today
    # Note: We use the IP as the primary identifier for free usage for simplicity as requested.
    # In a real app, we might check User ID designated by auth token.
    
    try:
        # Query: Select count for (ip, date)
        res = supabase.table("user_usage")\
            .select("count")\
            .eq("ip_address", ip)\
            .eq("date", today)\
            .execute()
            
        current_count = 0
        if res.data:
            current_count = res.data[0]['count']
            
        if current_count >= FREE_USAGE_LIMIT:
            raise HTTPException(status_code=403, detail=LOCK_MESSAGE)
            
        # 2. Increment Usage
        # If record exists, update. If not, insert.
        if res.data:
            # Update
            new_count = current_count + 1
            supabase.table("user_usage")\
                .update({"count": new_count})\
                .eq("ip_address", ip)\
                .eq("date", today)\
                .execute()
        else:
            # Insert
            supabase.table("user_usage")\
                .insert({
                    "ip_address": ip,
                    "date": today,
                    "count": 1
                })\
                .execute()
                
        return True

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Usage tracking error: {e}")
        # Allow pass-through on system error to avoid blocking legitimate users due to bug
        # But in a strict secure system, you might want to block.
        # For now, we log and proceed to be safe.
        return True
