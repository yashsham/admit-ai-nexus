import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_counselor():
    print("\n--- Testing AI Counselor ---")
    payload = {
        "message": "Find info about Stanford University admissions",
        "context": "counselor",
        "history": []
    }
    # We expect a streaming response, but for simple test check status 200
    try:
        res = requests.post(f"{BASE_URL}/chat/", json=payload, stream=True)
        print(f"Status: {res.status_code}")
        # Read a bit of the stream
        content = ""
        for chunk in res.iter_content(chunk_size=1024):
             content += chunk.decode()
             if len(content) > 200: break
        print(f"Response Snippet: {content[:100]}...")
        if res.status_code == 200:
            print("✅ Counselor Agent OK")
        else:
            print(f"❌ Counselor Failed: {res.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_assistant():
    print("\n--- Testing AI Assistant ---")
    payload = {
        "message": "What is my latest campaign?",
        "context": "dashboard",
        "history": [],
        "dashboard_context": {"campaigns": [{"id": "123", "name": "Test Camp"}]}
    }
    try:
        res = requests.post(f"{BASE_URL}/chat/", json=payload, stream=True)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
             print("✅ Assistant Agent OK")
        else:
             print(f"❌ Assistant Failed: {res.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_counselor()
    test_assistant()
