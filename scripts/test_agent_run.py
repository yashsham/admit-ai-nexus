import sys
import os
from typing import Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Mock Env
os.environ["ENVIRONMENT"] = "development"
# Check if keys exist
if not os.getenv("GROQ_API_KEY"):
    print("[WARN] GROQ_API_KEY not set in env, checking .env file loading...")

from app.core.config import settings
print(f"Loaded Settings. Groq Key Present: {bool(settings.GROQ_API_KEY)}")

try:
    from app.ai.models.agent_factory import get_assistant_agent
    
    print("Initializing Agent...")
    agent = get_assistant_agent(user_id="test_user")
    
    print("Running Agent (Dry Run)...")
    # We won't make a full LLM call if possible to save cost/time, but we need to check if .run() crashes.
    # Actually, we MUST make an LLM call to verify the API connection.
    response: Any = agent.run("Hello, are you working?")
    
    print(f"Agent Response: {response.content}")
    print("[SUCCESS] Agent executed successfully.")
    
except Exception as e:
    print(f"[FAIL] Agent Execution Failed: {e}")
    import traceback
    traceback.print_exc()
