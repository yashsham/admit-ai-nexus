
import os
from supabase import create_client, Client

# Load env vars from .env if needed, but for now assuming hardcoded or env vars are set in terminal.
# I'll try to read d:\Admit\.env if it exists, otherwise rely on system envs or placeholder.
# Actually, I'll just check if I can run this inside the existing app context or import app.

import sys
sys.path.append('d:\\Admit\\backend')

try:
    from app import supabase
    print("Succesfully imported supabase client from app.py")
    
    # Try to insert a dummy candidate to see what columns are allowed?
    # No, that writes data.
    # Try to select one candidate and print keys
    
    print("Checking 'candidates' table columns...")
    try:
        res = supabase.table("candidates").select("*").limit(1).execute()
        if res.data:
            print("Columns found in 'candidates':", res.data[0].keys())
        else:
            print("No data in candidates, cannot determine columns easily without metadata query.")
            # Try inserting a dummy with just name/phone to see if it works, then delete it.
    except Exception as e:
        print(f"Error selecting candidates: {e}")

    print("\nChecking 'active_campaigns' or similar?")
    # Check if 'campaign_executions' exists
    try:
        res = supabase.table("campaign_executions").select("*").limit(1).execute()
        print("Table 'campaign_executions' exists.")
    except Exception as e:
        print(f"Table 'campaign_executions' error/missing: {e}")

except Exception as e:
    print(f"Setup error: {e}")
