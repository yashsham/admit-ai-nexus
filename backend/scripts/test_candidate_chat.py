import requests
import uuid
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Adjust URL if needed
BASE_URL = "http://localhost:8001/api/chat/"
USER_ID = str(uuid.uuid4())

def send_message(message, expected_keywords=[], context="assistant"):
    payload = {
        "message": message,
        "history": [],
        "context": context,
        "user_id": USER_ID
    }
    try:
        print(f"\n[User]: {message}")
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
            
            for kw in expected_keywords:
                if kw.lower() not in full_resp.lower():
                    print(f"FAIL: Expected '{kw}' in response.")
                    return full_resp
            return full_resp
    except Exception as e:
        print(f"Request Error: {e}")
        return ""

def run_test():
    print(f"--- Starting Candidate Upload Chat Test (User: {USER_ID}) ---")
    
    # 1. Start Flow
    send_message("Create a new campaign", ["Campaign Name"])

    # 2. Name
    send_message("Candidate Test Campaign", ["Campaign Type"])

    # 3. Type
    send_message("Recruitment", ["Target Audience"])

    # 4. Audience
    send_message("Python Developers", ["Instructions"])

    # 5. Instructions
    send_message("Join our team.", ["Verification", "Yes/No"])

    # 6. Confirm -> Expect "Upload candidates"
    resp = send_message("Yes", ["Created", "Upload candidates", "Yes/No"])
    if "upload candidates" not in resp.lower():
        print("FAIL: Did not ask to upload candidates.")
        return

    # 7. Yes to Upload -> Expect "Provide details"
    send_message("Yes", ["Provide candidate details", "Done"])

    # 8. Add Candidate
    resp = send_message("Alice Worker, alice@example.com, +15550100", ["Added", "Alice/alice", "Add another"])
    
    # 9. Done
    send_message("Done", ["Finished", "Launch execution"])
    
    print("\n>>> SUCCESS: Full flow completed! <<<")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Test Failed: {e}")
