
import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.supabase_client import supabase

async def seed_interested():
    print("Seeding one interested candidate...")
    try:
        # Get a random candidate
        res = supabase.table("candidates").select("id, tags").limit(1).execute()
        if not res.data:
            print("No candidates found to seed.")
            return

        candidate = res.data[0]
        cid = candidate['id']
        current_tags = candidate.get('tags') or []
        
        # Ensure list
        if isinstance(current_tags, str):
            current_tags = [current_tags]
            
        if "interested" not in current_tags:
            current_tags.append("interested")
            
            # Update
            supabase.table("candidates").update({"tags": current_tags}).eq("id", cid).execute()
            print(f"Marked candidate {cid} as interested.")
        else:
            print("Candidate already interested.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(seed_interested())
