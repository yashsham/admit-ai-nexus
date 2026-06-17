
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.supabase_client import supabase

async def inspect():
    try:
        # Get one row to see structure
        res = supabase.table("candidates").select("*").limit(1).execute()
        if res.data:
            print("Row keys:", res.data[0].keys())
        else:
            print("No data in candidates table")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(inspect())
