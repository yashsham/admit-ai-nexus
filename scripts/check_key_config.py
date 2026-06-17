import sys
import os
from dotenv import load_dotenv

sys.path.append('d:\\Admit\\backend')
load_dotenv('d:\\Admit\\.env')

from app.core.config import settings

print("--- Key Configuration Check (Simple) ---")
print(f"Loaded SUPABASE_URL: {settings.SUPABASE_URL}")
print(f"Loaded SUPABASE_KEY: {settings.SUPABASE_KEY}")

anon_key = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
print(f"Known Anon Key:      {anon_key}")

if settings.SUPABASE_KEY == anon_key:
    print("\n[CRITICAL] Backend is configured with the ANON/PUBLIC KEY!")
    print("Background tasks will FAIL to read data due to RLS.")
else:
    print("\n[OK] Backend key differs from Anon key (Likely Service Role).")
