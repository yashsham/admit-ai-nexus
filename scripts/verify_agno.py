
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_counselor():
    print("\n--- Testing Agno Counselor ---")
    payload = {
        "message": "Find info about Harvard University admissions",
        "context": "counselor",
        "history": []
    }
    try:
        res = requests.post(f"{BASE_URL}/chat/", json=payload, stream=True)
        print(f"Status: {res.status_code}")
        content = ""
        for chunk in res.iter_content(chunk_size=1024):
             content += chunk.decode()
             if len(content) > 300: break
        print(f"Response Snippet: {content[:200]}...")
        if res.status_code == 200:
            print("✅ Counselor Agent OK")
        else:
            print(f"❌ Counselor Failed: {res.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_assistant():
    print("\n--- Testing Agno Assistant (Stats) ---")
    payload = {
        "message": "Get my dashboard stats please",
        "context": "dashboard",
        "history": [],
        "dashboard_context": {
            "campaigns": [{"id": "1", "name": "C1"}],
            "candidates": [{"id": "1", "name": "John"}],
            "extra_list": list(range(20)) # Test summarization logic
        }
    }
    try:
        res = requests.post(f"{BASE_URL}/chat/", json=payload, stream=True)
        print(f"Status: {res.status_code}")
        content = ""
        for chunk in res.iter_content(chunk_size=1024):
             content += chunk.decode()
             if len(content) > 500: break
        print(f"Response Snippet: {content}...")
        
        if res.status_code == 200:
             print("✅ Assistant Agent OK")
        else:
             print(f"❌ Assistant Failed: {res.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_counselor()
    test_assistant()
