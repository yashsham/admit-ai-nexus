import requests
import uuid
import time
import sys

# Adjust URL if needed (defaulting to local dev)
BASE_URL = "http://localhost:8000/api/chat/"
USER_ID = str(uuid.uuid4())

def send_message(message, context="assistant"):
    payload = {
        "message": message,
        "history": [],
        "context": context,
        "user_id": USER_ID
    }
    try:
        print(f"\n[User]: {message}")
        # Disable proxy for localhost to avoid env var issues
        session = requests.Session()
        session.trust_env = False
        
        with session.post(BASE_URL, json=payload, stream=True) as r:
            if r.status_code != 200:
                print(f"Error Status: {r.status_code}")
                print(r.text)
                return ""
                
            print("[Bot]: ", end="")
            full_resp = ""
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    text = chunk.decode("utf-8")
                    print(text, end="", flush=True)
                    full_resp += text
            print()
            return full_resp
    except Exception as e:
        print(f"Request Error: {e}")
        return ""

def run_test():
    print(f"--- Starting Campaign Chat Test (User: {USER_ID}) ---")
    
    # 1. Start Flow
    resp = send_message("I want to create a new campaign")
    if "Campaign Name" not in resp:
        print("FAIL: Did not ask for Campaign Name")
        return

    # 2. Name
    resp = send_message("Summer Outreach 2025")
    if "Campaign Type" not in resp:
        print("FAIL: Did not ask for Campaign Type")
        return

    # 3. Type
    resp = send_message("Recruitment")
    if "audience" not in resp.lower():
         print("FAIL: Did not ask for Target Audience")
         return

    # 4. Audience
    resp = send_message("High School Seniors")
    if "Instructions" not in resp and "goal" not in resp.lower():
         print("FAIL: Did not ask for Instructions")
         return

    # 5. Instructions
    resp = send_message("Invite them to the virtual open house on Sunday.")
    if "Verification" not in resp:
         print("FAIL: Did not show verification summary")
         return

    # 6. Confirm
    resp = send_message("Yes, please create it.")
    if "Successfully" in resp:
        print("\n>>> SUCCESS: Campaign Created! <<<")
    else:
        print("\nFAIL: Campaign creation failed or uncertain response.")

if __name__ == "__main__":
    try:
        import requests
        run_test()
    except ImportError:
        print("Please install requests: pip install requests")
