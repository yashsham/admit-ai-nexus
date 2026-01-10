
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.supabase_client import supabase

async def verify():
    print("Verifying Analytics Data...")
    
    try:
        q_total = supabase.table("campaign_executions").select("*", count="exact", head=True)
        res = q_total.execute()
        print(f"Total Sent (head=True): {res.count}")
        
        # 1. Total Sent (Mimic Backend Fix)
        q_total = supabase.table("campaign_executions").select("*", count="exact", head=True)
        res = q_total.execute()
        print(f"Total Sent (head=True): {res.count}")
        
        # 2. Failed
        q_fail = supabase.table("campaign_executions").select("*", count="exact", head=True).eq("status", "failed")
        res_fail = q_fail.execute()
        print(f"Total Failed (head=True): {res_fail.count}")
        
    except Exception as e:
        print(f"DB Error: {e}")
        return

    # 3. Check Campaigns
    try:
        res = supabase.table("campaigns").select("*").limit(5).execute()
        print(f"Campaigns found: {len(res.data)}")
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
