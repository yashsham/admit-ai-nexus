import requests
import time
import json
from config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_auto_execution():
    print("🧪 Starting Backend Auto-Execution Test...")
    
    # 1. Get a User ID (or use a test one)
    # We'll use the first user we find
    users = supabase.auth.admin.list_users() # Admin requires secret key usually, let's use public table if possible or assume a user exists
    
    # Actually, simpler: Use same ID as previous tests or hardcoded from previous logs
    # Let's search for a user in 'profiles'
    profiles = supabase.table("profiles").select("user_id").limit(1).execute()
    if not profiles.data:
        print("❌ No users found to test with.")
        return
        
    user_id = profiles.data[0]['user_id']
    print(f"👤 Using User ID: {user_id}")
    
    # 2. Create Campaign via API
    payload = {
        "user_id": user_id,
        "name": f"Auto-Exec Test {int(time.time())}",
        "goal": "Verify email sending works automatically.",
        "channels": ["email"]
    }
    
    try:
        print("🚀 Sending Create Request...")
        res = requests.post("http://127.0.0.1:8000/api/campaigns/create", json=payload)
        print(f"Response: {res.status_code}")
        data = res.json()
        print(f"Data: {data}")
        
        if not data.get("success"):
            print("❌ Creation Failed")
            return
            
        campaign_id = data['campaign']['id']
        print(f"✅ Campaign Created: {campaign_id}")
        
        # 3. Poll for Executions
        print("⏳ Waiting for background execution (10s)...")
        time.sleep(10)
        
        print("🔍 Checking 'campaign_executions' table...")
        execs = supabase.table("campaign_executions").select("*").eq("campaign_id", campaign_id).execute()
        
        count = len(execs.data)
        print(f"📊 Executions Found: {count}")
        
        if count > 0:
            print("✅ SUCCESSS! Auto-execution triggered and records found.")
            for e in execs.data:
                print(f"   - {e['status']} | {e['channel']} | {e['recipient']}")
        else:
            print("❌ FAILURE: No executions found. Auto-trigger did not work.")
            
        # 4. Cleanup
        # supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_auto_execution()
