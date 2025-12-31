import asyncio
from unittest.mock import MagicMock, patch
import os
from app.core.agent_factory import get_model_priority
from phi.agent import Agent

async def test_fallback():
    print("--- Testing Fallback Logic ---")
    
    # 1. Mock the models
    # We want model[0] to fail, model[1] to succeed.
    
    real_models = get_model_priority()
    print(f"Real Models Detected: {[type(m).__name__ for m in real_models]}")
    
    # Create Mock Models
    bad_model = MagicMock()
    bad_model.side_effect = Exception("Simulated Auth Failure")
    # For Phidata, Agent.run() calls model.generate_response potentially.
    
    good_model = MagicMock()
    
    # Depending on Phidata version, we might need to mock Agent.run directly if we can't easily mock the Model behavior deeper down.
    # Let's try running the REAL loop but with a fake 'bad' ID inserted at result[0] if possible, 
    # OR just rely on unit test logic.
    
    # Simpler: Let's just try to Instantiate the Agent with a Bad Key for the first model if we can.
    # But settings are global.
    
    # Let's mimic the loop logic from chat.py:
    print("\n[Simulation] Starting Priority Loop...")
    
    # Inject a fake "BadModel" at start of list
    class BadModel:
        def __init__(self): pass
    
    # Mocking Agent to fail when run with BadModel
    original_agent_cls = Agent
    
    class MockAgent(Agent):
        def run(self, *args, **kwargs):
            if isinstance(self.model, BadModel):
                print(" -> MockAgent: Running with BadModel... BOOM!")
                raise ConnectionError("Simulated Connection Error to Primary Model")
            print(f" -> MockAgent: Running with {type(self.model).__name__}... Success!")
            # RETURN a generator for stream
            yield "Hello from Fallback!"
            
    # Test List
    test_models = [BadModel()] + real_models
    
    for model_instance in test_models:
        try:
            print(f"Attempting Model: {type(model_instance).__name__}")
            agent = MockAgent(model=model_instance)
            
            # Mimic chat.py run
            resp_stream = agent.run("Hi", stream=True)
            
            for chunk in resp_stream:
                print(f" -> Chunk Received: {chunk}")
            
            print("✅ Success! Loop broke correctly.")
            break
        except Exception as e:
            print(f"❌ Failed: {e}. Continuing...")
            continue

if __name__ == "__main__":
    asyncio.run(test_fallback())
