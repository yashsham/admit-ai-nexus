import requests
import json

try:
    print("Attempting to fetch analytics...")
    response = requests.get("http://127.0.0.1:8000/api/analytics", timeout=5)
    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
