import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Mock Environment Variables to satisfy Pydantic Config
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock_key"
os.environ["GROQ_API_KEY"] = "mock_key"
os.environ["GOOGLE_API_KEY"] = "mock_key"
os.environ["ENVIRONMENT"] = "development"

try:
    print("Testing Imports...")
    from app.api.v1 import chat
    print("[OK] Chat module loaded")
    from app.api.v1 import campaigns
    print("[OK] Campaigns module loaded")
    from app.ai.models import agent_factory
    print("[OK] Agent Factory loaded")
    from app.workflows import campaign_agno
    print("[OK] Campaign Agno loaded")
    print("ALL SYSTEMS GO")
except Exception as e:
    print(f"[FAIL] IMPORT ERROR: {e}")
    import traceback
    traceback.print_exc()
