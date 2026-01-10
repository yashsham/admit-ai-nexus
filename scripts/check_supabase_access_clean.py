from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv("d:/Admit/backend/.env")

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

print(f"URL: {url}")
# print(f"Key used: {key}") 

try:
    if not url or not key:
        print("Missing Credentials")
    else:
        client = create_client(url, key)
        # Try to fetch 1 row
        res = client.table("campaign_executions").select("*", count="exact").limit(1).execute()
        print(f"Query Result Count: {res.count}")
        
        if res.count == 0:
            print("Returned 0 rows. Likely RLS blocking access (Anon Key used).")
        else:
            print("Data accessible.")

except Exception as e:
    print(f"Error: {e}")
