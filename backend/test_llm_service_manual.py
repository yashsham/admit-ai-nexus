import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.llm_generation import generate_personalized_content

print("--- Testing generate_personalized_content ---")
try:
    candidate = {"name": "Test User", "city": "New York", "course": "AI Engineering"}
    prompt = "Invite them to a webinar"
    channel = "email"
    
    print(f"Input: {candidate}, Prompt: {prompt}, Channel: {channel}")
    
    result = generate_personalized_content(candidate, prompt, channel)
    
    print("\n--- Result ---")
    print(result)
    print("\n--- Success ---")

except Exception as e:
    print(f"\n--- FAILED ---")
    print(e)
    import traceback
    traceback.print_exc()
