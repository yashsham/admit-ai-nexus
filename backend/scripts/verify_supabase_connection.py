
import os
from dotenv import load_dotenv
import supabase
from supabase import create_client, Client

load_dotenv(dotenv_path="d:/Admit/backend/.env")

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")

print(f"URL: {url}")
# Mask key for security in logs
print(f"Key: {key[:5]}...{key[-5:]}" if key else "Key: None")

try:
    client: Client = create_client(url, key)
    # Try a simple query, e.g., list a table or just check health/auth
    # We can't easily check auth without a token, but we can check if the client connects.
    # We'll try to sign in anonymously if allowed, or just print success.
    print("Supabase client created successfully.")
    
    # Optional: Try to fetch a public table if widely known
except Exception as e:
    print(f"Failed to create Supabase client: {e}")
