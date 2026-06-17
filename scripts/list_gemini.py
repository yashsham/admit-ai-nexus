import os
from google import genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("Error: GOOGLE_API_KEY not found in .env")
    exit(1)

client = genai.Client(api_key=api_key)

print("--- Listing Gemini Models ---")
try:
    for m in client.models.list():
        # New SDK model object structure
        if "generateContent" in (m.supported_generation_methods or []):
            print(f"Model: {m.name} | Display: {m.display_name}")
except Exception as e:
    print(f"Error: {e}")
