import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from app.core.agent_factory import get_model_priority

print("--- Verifying Model Priority ---")
try:
    print(f"OpenRouter Key Present: {bool(settings.OPENROUTER_API_KEY)}")
    print(f"Gemini Key Present: {bool(settings.GOOGLE_API_KEY)}")
    print(f"Groq Key Present: {bool(settings.GROQ_API_KEY)}")

    models = get_model_priority()
    
    print(f"\nTotal Models Initialized: {len(models)}")
    
    for i, model in enumerate(models):
        name = type(model).__name__
        model_id = getattr(model, "model", getattr(model, "id", "Unknown"))
        print(f"[{i+1}] {name} - ID: {model_id}")

    # Check order
    if len(models) > 0 and "OpenAI" in type(models[0]).__name__:
        print("\n✅ SUCCESS: OpenRouter (OpenAI) is #1 Priority")
    else:
        print("\n⚠️ NOTICE: OpenRouter is NOT #1 (Check Keys)")

except Exception as e:
    print(f"\n❌ Error: {e}")
