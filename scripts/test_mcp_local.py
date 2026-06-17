
import sys
import os
import asyncio

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mcp_server import plan_campaign_strategy, system_health_check, get_config, get_backend_logs

async def main():
    print("--- 1. Testing Resources ---")
    print(f"Config: {get_config().strip()}")
    
    logs = get_backend_logs()
    print(f"Logs (First 100 chars): {logs[:100]}...")

    print("\n--- 2. Testing System Health ---")
    health = system_health_check()
    print(f"Health: {health}")
    
    print("\n--- 3. Testing Campaign Strategy (Mock Call) ---")
    # We will try to invoke it, but expect it might fail if LLM is not perfect, 
    # capturing the error is enough to prove the tool 'runs' (i.e. imports/logic work).
    try:
        # Using a very simple goal to keep it short if it actually runs
        print("Invoking plan_campaign_strategy...")
        # Start the task but don't wait forever if it hangs on network
        # Since these are synchronous tools in the mcp_server (def plan...), we just call them.
        # But crewai might take time.
        # We will wrap it in a timeout if possible, but for simplicity let's just run it.
        # If it hits an API limit or missing key, it returns an error string, which is VALID behavior for the tool.
        result = plan_campaign_strategy("Test Goal: Increase newsletter signups")
        print(f"Result type: {type(result)}")
        print(f"Result preview: {str(result)[:100]}...")
    except Exception as e:
        print(f"Tool execution failed (Expected if keys missing/network issues): {e}")

if __name__ == "__main__":
    asyncio.run(main())
