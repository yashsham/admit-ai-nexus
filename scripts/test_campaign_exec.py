import asyncio
import sys
from dotenv import load_dotenv

sys.path.append('d:\\Admit\\backend')
load_dotenv('d:\\Admit\\.env')

from app.api.v1.endpoints.campaigns import run_campaign_execution


def test_exec():
    print("--- Simulating Campaign Execution (Sync) ---")
    mock_campaign = {
        "channels": ["email"],
        "metadata": {"template_body": "Hello {{name}}, this is a test."}
    }
    mock_recipients = [
        {"name": "Test Candidate", "email": "admitconnectai@gmail.com", "phone": "1234567890"}
    ]
    
    try:
        run_campaign_execution("test_camp_id_123", mock_campaign, mock_recipients)
    except Exception as e:
        print(f"Execution finished with expected DB error (ignored): {e}")

if __name__ == "__main__":
    test_exec()
