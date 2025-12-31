import requests
import json
import os

url = "http://localhost:8000/api/chat/" # Correct route per backend logs
headers = {
    "Content-Type": "application/json"
}
payload = {
    "message": "Hello, are you working?",
    "history": [],
    "context": "general"
}

try:
    print(f"Sending request to {url}...")
    # Enable stream=True since the endpoint returns StreamingResponse
    response = requests.post(url, json=payload, headers=headers, stream=True)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("Response Content:")
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                print(chunk.decode('utf-8'), end='', flush=True)
        print("\n[End of Stream]")
    else:
        print(f"Error: {response.text}")

except Exception as e:
    print(f"Connection Error: {e}")
