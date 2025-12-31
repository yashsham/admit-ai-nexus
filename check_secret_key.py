from dotenv import load_dotenv
import os
from supabase import create_client

# Load backend env to get the URL
load_dotenv("d:/Admit/backend/.env")

url = os.getenv("VITE_SUPABASE_URL")
# The key provided by the user
key = "sb_secret_1IwdLOhkpDzEfd3BRC9mkg_mqtezD4W"

print(f"Testing URL: {url}")
print(f"Testing Key: {key}")

try:
    if not url:
        print("❌ Missing URL")
    else:
        # Initialize client
        client = create_client(url, key)
        
        # Try to fetch 1 row from user_usage (which we know exists and might be empty, but query should work)
        # or campaign_executions
        print("Attempting query...")
        res = client.table("user_usage").select("*", count="exact").limit(1).execute()
        
        print(f"✅ Success! Data accessible. Count: {res.count}")

except Exception as e:
    print(f"❌ Failed: {e}")
