import os
from dotenv import load_dotenv

# Load from current directory
load_dotenv()

print("--- Environment Introspection ---")
print(f"Current Working Directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")

keys_to_check = [
    "SUPABASE_URL", "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_ANON_KEY",
    "GROQ_API_KEY", "VITE_GROQ_API_KEY"
]

for key in keys_to_check:
    value = os.getenv(key)
    status = "FOUND" if value else "MISSING"
    print(f"{key}: {status}")

print("--------------------------------")
