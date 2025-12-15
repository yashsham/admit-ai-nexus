import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def test_analytics():
    print("Testing Analytics Performance...")
    start = time.time()
    resp = requests.get(f"{BASE_URL}/analytics")
    duration = time.time() - start
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"Success! Time: {duration:.4f}s")
        print(f"Overview: {data.get('overview')}")
        recents = data.get('recent_activity', [])
        print(f"Recent Count: {len(recents)} (Should be <= 5)")
    else:
        print(f"Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    test_analytics()
