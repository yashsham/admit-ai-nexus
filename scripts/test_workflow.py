import requests
import uuid
import time
import sys

BASE_URL = "http://localhost:8000"

def test():
    print("⏳ Waiting for backend to start...")
    # Give app.py a moment to spin up
    for i in range(10):
        try:
            r = requests.get(f"{BASE_URL}/")
            if r.status_code == 200:
                print("✅ Backend is Online!")
                break
        except:
            time.sleep(1)
            print(".", end="", flush=True)
    else:
        print("\n❌ Backend failed to start or is unreachable.")
        sys.exit(1)

    # 1. Setup Data
    user_id = str(uuid.uuid4())
    print(f"\n👤 Generated Test User ID: {user_id}")

    # 2. Upload Candidates
    print("\n--- 1. Testing Upload Candidates ---")
    try:
        files = {'file': ('test_candidates.csv', open('test_candidates.csv', 'rb'), 'text/csv')}
        data = {'user_id': user_id}
        r = requests.post(f"{BASE_URL}/api/candidates/upload", data=data, files=files)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"❌ Upload Failed: {e}")
        sys.exit(1)

    # 3. Create Campaign
    print("\n--- 2. Testing Create Campaign ---")
    try:
        camp_data = {"user_id": user_id, "goal": "Integration Test Campaign"}
        r = requests.post(f"{BASE_URL}/api/campaigns/create", json=camp_data)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
        if r.status_code != 200:
            print("❌ Creation Failed")
            sys.exit(1)
        
        campaign_id = r.json()['campaign']['id']
        print(f"🎯 Created Campaign ID: {campaign_id}")
    except Exception as e:
        print(f"❌ Create Failed: {e}")
        sys.exit(1)

    # 4. Execute Campaign
    print("\n--- 3. Testing Execute Campaign ---")
    try:
        exec_data = {"campaign_id": campaign_id}
        r = requests.post(f"{BASE_URL}/api/campaigns/execute", json=exec_data)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"❌ Execution Failed: {e}")
        sys.exit(1)

    print("\n✅ Verification Script Completed.")

if __name__ == "__main__":
    test()
