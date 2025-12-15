from dotenv import load_dotenv
import sys
from supabase import create_client

from app.core.config import settings

url = settings.SUPABASE_URL
key = settings.SUPABASE_KEY

if not url or not key:
    print("Error: Supabase credentials not found in env")
    sys.exit(1)

supabase = create_client(url, key)

print("--- Inspecting Recent 5 Candidates ---")
res = supabase.table("candidates").select("*").order("created_at", desc=True).limit(5).execute()
for c in res.data:
    print(f"Name: {c.get('name')}, Email: '{c.get('email')}', Phone: '{c.get('phone')}', Tags: {c.get('tags')}")

print("\n--- Inspecting Recent Campaigns ---")
res = supabase.table("campaigns").select("*").order("created_at", desc=True).limit(3).execute()
for c in res.data:
    print(f"ID: {c['id']}, Name: {c['name']}, Channels: {c.get('channels')}")
