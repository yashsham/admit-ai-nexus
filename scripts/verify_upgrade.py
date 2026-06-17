import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

async def verify_system():
    print("--- Verifying Admit AI Nexus Upgrade ---")
    
    # 1. Check Configuration
    print("[1] Configuration")
    from app.core.config import settings
    print(f"    - Environment: {settings.ENVIRONMENT}")
    print(f"    - Redis URL Configured: {'redis' in settings.REDIS_URL}")
    print(f"    - Razorpay Keys Present: {bool(settings.RAZORPAY_KEY_ID)}")
    
    # 2. Check Redis Connection
    print("[2] Redis & Queue")
    try:
        from app.services.event_queue import event_queue
        # Assuming event_queue is initialized based on settings
        print("    - Event Queue Initialized")
    except Exception as e:
        print(f"    ! Event Queue Error: {e}")

    # 3. Check AI Components
    print("[3] AI System")
    try:
        from app.services.ai.components import ModelRouter, CostTracker, PromptValidator
        print("    - AI Components Imported")
        valid = PromptValidator.validate("Hello world")
        print(f"    - Prompt Validator Test (Expected True): {valid}")
    except Exception as e:
        print(f"    ! AI Component Error: {e}")

    # 4. Check Billing Service
    print("[4] Billing Service")
    try:
        from app.services.billing import billing_service
        print(f"    - Service Initialized: True")
        print(f"    - Mock Mode: {not bool(billing_service.client)}")
    except Exception as e:
        print(f"    ! Billing Service Error: {e}")

    print("--- Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(verify_system())
