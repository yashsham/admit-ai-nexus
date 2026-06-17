from app.core.config import settings
from app.core.agent_factory import get_model
from phi.model.huggingface import HuggingFaceChat
import os

# Temporarily mock settings to force HF
print("--- Testing Hugging Face Fallback ---")

# 1. Back up existing keys
original_groq = settings.GROQ_API_KEY
original_google = settings.GOOGLE_API_KEY

try:
    # 2. Kill primary keys to force fallback behavior
    settings.GROQ_API_KEY = ""
    settings.GOOGLE_API_KEY = ""
    
    # 3. Get Model
    model = get_model()
    print(f"Model ID: {model.id}")
    print(f"Model Type: {type(model)}")
    
    if isinstance(model, HuggingFaceChat):
        print("✅ Correctly selected HuggingFaceChat model")
    else:
        print(f"❌ Failed: Selected {type(model)} instead")

    # 4. Optional: Dry Run (requires internet)
    # print("Attempting inference (dry run)...")
    # try:
    #    resp = model.invoke("Hello, are you functional?")
    #    print(f"Response: {resp}")
    #    print("✅ Inference Successful")
    # except Exception as e:
    #    print(f"⚠️ Inference Error (Check API Key/Quota): {e}")

finally:
    # Restore Keys
    settings.GROQ_API_KEY = original_groq
    settings.GOOGLE_API_KEY = original_google
    print("\nSettings restored.")
