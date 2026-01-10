import os
import requests
import json
from services import tools

# 1. Set Credentials from Prompt
os.environ["RETELL_API_KEY"] = "key_a4993f4b2c7aaa10cbd0039cc6be"
os.environ["RETELL_AGENT_ID"] = "agent_24d4914a3fec0cfe186a53de0b"
os.environ["RETELL_LLM_ID"] = "llm_a4dabf67418b3d1ca67efccb08f8"

# 2. Define Test Recipient (Use a safe dummy or ask user. I'll use a placeholder and expect 400 Bad Request if invalid, or success if valid)
# Retell won't call 0000000000.
# I'll use a standard format +1 555 0199 (Example range) to test validation.
# Or better, just call the function and expect signature verification failure or specific retell error
to_number = "+15550109999" 

print(f"Testing Retell API with Agent: {os.environ['RETELL_AGENT_ID']}")

# 3. Call Function
result = tools.make_voice_call(to_number, {"customer_name": "Test User"})
print(f"Result: {result}")

# 4. Helper to debug From Number Requirement
if "error" in result:
    print("\n--- Diagnostic ---")
    if "from_number" in result:
        print("Diagnosis: You MUST provide a 'from_number' linked to your Retell Account.")
    elif "401" in result:
        print("Diagnosis: API Key Rejected.")
    elif "404" in result:
        print("Diagnosis: Agent ID Not Found.")
