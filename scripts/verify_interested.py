
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.supabase_client import supabase

async def verify_interested():
    print("Verifying Interested Candidates in DB...")
    try:
        # Use simple count first
        res = supabase.table("candidates").select("id", count="exact").eq("status", "interested").execute()
        print(f"Interested Candidates (DB Count): {res.count}")
        
        # Check unique statuses to see what IS there
        # This is harder to do efficiently in one query without group by, so we'll just sample
        res_sample = supabase.table("candidates").select("status").limit(50).execute()
        statuses = set(row['status'] for row in res_sample.data if row.get('status'))
        print(f"Found Statuses in sample: {statuses}")

    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_interested())
