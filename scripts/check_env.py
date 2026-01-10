import os
from dotenv import load_dotenv

print("--- Environment Debug ---")
loaded = load_dotenv()
print(f"load_dotenv() returned: {loaded}")

key = os.getenv("GROQ_API_KEY")
if key:
    print(f"GROQ_API_KEY found: {key[:5]}...{key[-4:]}")
else:
    print("❌ GROQ_API_KEY NOT FOUND")

print(f"Current Working Directory: {os.getcwd()}")
