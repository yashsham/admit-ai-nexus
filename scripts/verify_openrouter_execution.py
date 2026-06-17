import sys
import os
import traceback

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.agent_factory import get_model_priority, get_counselor_agent

def verify_execution():
    print("--- Verifying OpenRouter Execution ---")
    
    try:
        models = get_model_priority()
        if not models:
            print("❌ No models found!")
            return

        # We expect OpenRouter to be first
        primary_model = models[0]
        model_name = type(primary_model).__name__
        model_id = getattr(primary_model, "model", getattr(primary_model, "id", "Unknown"))
        
        print(f"Primary Model: {model_name} (ID: {model_id})")
        
        if "OpenAI" not in model_name and "gpt" not in model_id:
            print("⚠️ WARNING: Primary model does not look like OpenRouter/OpenAI")
            
        print("\n--- Invoking Agent with Primary Model ---")
        agent = get_counselor_agent(model=primary_model)
        
        response = agent.run("Hello, simply say 'OpenRouter is working' if you can hear me.", stream=False)
        
        print(f"\nResponse Content: {response.content}")
        print("\n✅ SUCCESS: Agent returned response.")
        
    except Exception as e:
        print(f"\n❌ EXECUTION FAILED: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    verify_execution()
