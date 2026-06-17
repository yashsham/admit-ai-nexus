import requests
import uuid
import time
import sys
import json

BASE_URL = "http://localhost:8000"

def test_email_integration():
    print("Starting Email Integration Verification...")

    # Wait for server
    print("Waiting for backend...")
    for _ in range(10):
        try:
            requests.get(f"{BASE_URL}/")
            print("[OK] Backend is ready!")
            break
        except:
            time.sleep(1)
    else:
        print("\n[False] Backend not reachable.")
        sys.exit(1)

    # 1. Setup Data
    user_id = str(uuid.uuid4())
    print(f"[User] User ID: {user_id}")
    
    # 2. Upload Candidate with Email
    # 2. Create Email Campaign FIRST
    print("\n--- 2. Creating Email Campaign ---")
    instructions = "Invite them to an exclusive coding workshop this weekend. Mention free pizza."
    camp_data = {
        "user_id": user_id, 
        "name": "Email Integration Test",
        "goal": instructions,
        "channels": ["whatsapp"] 
    }
    
    r = requests.post(f"{BASE_URL}/api/campaigns/create", json=camp_data)
    print(f"Creation: {r.status_code}")
    if r.status_code != 200:
        print(r.text)
        sys.exit(1)
        
    campaign_id = r.json()['campaign']['id']
    print(f"Campaign ID: {campaign_id}")

    # 3. Upload Candidate with Email AND Campaign ID
    print("\n--- 1. Uploading Candidate ---")
    csv_content = """name,email,phone,city,course
Charlie,charlie@example.com,5550103,San Francisco,Computer Science
"""
    files = {'file': ('email_test.csv', csv_content, 'text/csv')}
    # PASS CAMPAIGN ID HERE
    r = requests.post(f"{BASE_URL}/api/candidates/upload", data={'user_id': user_id, 'campaign_id': campaign_id}, files=files)
    print(f"Upload: {r.status_code}")

    # 4. Execute
    print(f"\n--- 3. Executing Campaign {campaign_id} ---")
    r = requests.post(f"{BASE_URL}/api/campaigns/execute", json={"campaign_id": campaign_id})
    print(f"Execute Start: {r.status_code}")

    print("\n--- 4. Verifying via Analytics ---")
    found = False
    for i in range(20): # increased timeout for LLM generation
        time.sleep(2)
        r = requests.get(f"{BASE_URL}/api/analytics?campaign_id={campaign_id}")
        data = r.json()
        activities = data.get("recent_activity", [])
        
        if activities:
            first_msg = activities[0]
            content = first_msg.get("message_content", "")
            channel = first_msg.get("channel", "")
            
            print(f"Found Message ({channel}): {content[:100]}...")
            
            if channel == "email":
                if "{" in content and "body" in content:
                     # It's JSON stringified? Wrapper logic might have saved it.
                     # In app.py I check: message_content = content_json.get("body", ...)
                     pass
                else:
                     # It should be the parsed body
                     pass
                
                # Check for HTML or Length
                if len(content) > 20 and "Admit AI Update" not in content:
                    print("[OK] Verified: Dynamic Content Detected!")
                    found = True
                    break
                
                # If my app.py extraction logic worked, 'message_content' is just the body
                # But wait, app.py logic said:
                # email_subject = content_json.get("subject")
                # message_content = content_json.get("body")
                # supabase.insert(..., "message_content": message_content)
                # So we won't see the SUBJECT in `message_content` column unless we saved it elsewhere.
                # However, knowing `message_content` is not the default static template is enough.
                
                if "Please contact us" not in content and "Hello! We have an update" not in content:
                     print("[OK] Verified: Content matches AI generation!")
                     found = True
                     break
    
    if not found:
        print("[Fail] Verification Failed: No dynamic email found in analytics.")
        sys.exit(1)

    print("\n[Success] Verification Successful.")

if __name__ == "__main__":
    test_email_integration()
