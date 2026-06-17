
import asyncio
from app.core.agent_factory import get_assistant_agent
from app.core.llm_factory import get_model_priority

async def test_bot():
    print("Testing Assistant Agent with fallback...")
    
    # Simulate a request flow
    models = get_model_priority()
    print(f"Found {len(models)} available models.")
    
    for model in models:
        try:
            print(f"Testing model: {type(model).__name__}")
            agent = get_assistant_agent(user_id="test_user", model=model)
            response = agent.run("Hello, who are you?", stream=False)
            print(f"Response: {response.content}")
            print("✅ Success")
            break
        except Exception as e:
            print(f"❌ Initial Model Failed: {e}")
            continue

if __name__ == "__main__":
    asyncio.run(test_bot())
