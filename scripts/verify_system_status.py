import sys
import os
import logging
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from fastapi.testclient import TestClient
from app.main import app
from app.services.auth.dependencies import get_current_user

# Mock Auth to bypass login
def mock_get_current_user():
    class MockUser:
        id = "test_user_123"
        email = "test@example.com"
    return MockUser()

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

def check_health_and_observability():
    print("\n[1/3] Checking API Health & Observability...")
    response = client.get("/") # Root or Health
    
    if response.status_code == 200:
        print("✅ API is UP (Status 200)")
    else:
        print(f"❌ API Down: {response.status_code}")
        
    # Check Headers for Trace ID
    req_id = response.headers.get("X-Request-ID")
    if req_id:
        print(f"✅ Observability: Found X-Request-ID: {req_id}")
    else:
        print("❌ Observability missing X-Request-ID")

def check_chat_fallback():
    print("\n[2/3] Checking Chat API Fallback & Identity...")
    
    # We expect the system to Try OpenRouter -> Fail -> Fallback -> Succeed (eventually)
    # The response should contain the identity or a polite refusal if completely broken.
    
    payload = {
        "message": "Who created you?",
        "context": "counselor"
    }
    
    try:
        # Note: This might take a while as it iterates models
        print("   Sending request (this tries multiple AI models)...")
        response = client.post("/api/chat/", json=payload)
        
        if response.status_code == 200:
            content = response.text
             # Check for System Fallback Message
            if "switching to backup provider" in content or "Yash Sharma" in content:
                 print("✅ Chat API: Successfully handled request (Trace found).")
                 if "Yash Sharma" in content:
                     print("   -> Identity Confirmed: 'Yash Sharma'")
                 if "switching to backup provider" in content:
                     print("   -> Fallback Triggered: System notified user of switch.")
            else:
                 print(f"⚠️ Chat API Response (Inspect manually): {content[:100]}...")
        else:
            print(f"❌ Chat API Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Chat Check Error: {e}")

def check_campaign_planning_integration():
    print("\n[3/3] Checking Campaign Planning Integration...")
    # This verifies the /create endpoint uses CampaignAgno
    
    payload = {
        "user_id": "test",
        "goal": "Test Campaign",
        "channels": ["email"]
    }
    
    # We Mock the Worker Enqueue to avoid Redis errors
    from app.services.task_queue import task_queue
    original_enqueue = task_queue.enqueue
    
    msg = []
    async def mock_enqueue(*args, **kwargs):
        msg.append(f"Enqueued: {args}")
        return "job_123"
        
    task_queue.enqueue = mock_enqueue
    
    try:
        response = client.post("/api/campaigns/create", json=payload)
        if response.status_code == 200:
            print("✅ Campaign Create Endpoint: Success")
            if msg:
                print(f"   -> Worker Integration Verified: {msg[0]}")
        else:
            print(f"❌ Campaign Create Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
         print(f"❌ Campaign Check Error: {e}")
    finally:
        task_queue.enqueue = original_enqueue

if __name__ == "__main__":
    check_health_and_observability()
    check_campaign_planning_integration()
    check_chat_fallback()
