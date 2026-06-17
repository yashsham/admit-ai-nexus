from dotenv import load_dotenv
import os
from supabase import create_client

# Explicitly load backend .env where I know the keys are
load_dotenv("d:/Admit/backend/.env")

url = os.getenv("VITE_SUPABASE_URL")
# This will pick up VITE_SUPABASE_PUBLISHABLE_KEY if SERVICE_KEY is missing
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

print(f"URL: {url}")
print(f"Key used: {key[:10]}..." if key else "None")

try:
    if not url or not key:
        print("❌ Missing Credentials")
    else:
        client = create_client(url, key)
        # Try to fetch 1 row
        res = client.table("campaign_executions").select("*", count="exact").limit(1).execute()
        print(f"Query Result Count: {res.count}")
        print(f"Data length: {len(res.data)}")
        
        if res.count == 0:
            print("⚠️ Returned 0 rows. Likely RLS blocking access (Anon Key used).")
        else:
            print("✅ Data accessible.")

except Exception as e:
    print(f"❌ Error: {e}")
