import os
import sys
from dotenv import load_dotenv

# Force load .env from root (d:\Admit\.env)
# Current file: d:\Admit\backend\debug_models.py
# dirname 1: d:\Admit\backend
# dirname 2: d:\Admit
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

from phi.model.google import Gemini
from phi.model.groq import Groq
from phi.model.huggingface import HuggingFaceChat

from phi.agent import Agent

def test_gemini():
    print("\n--- Testing Gemini ---")
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        print("❌ GOOGLE_API_KEY missing")
        return
    
    try:
        # Revert to stable 'gemini-pro'
        model = Gemini(id="gemini-pro", api_key=key)
        agent = Agent(model=model, markdown=True)
        res = agent.run("Hi")
        print(f"✅ Gemini Success: {res.content}")
    except Exception as e:
        print(f"❌ Gemini Failed: {e}")

def test_hf():
    print("\n--- Testing Hugging Face ---")
    key = os.getenv("HUGGINGFACE_API_KEY")
    if not key:
        print("❌ HUGGINGFACE_API_KEY missing")
        return
    
    try:
        model = HuggingFaceChat(id="mistralai/Mistral-7B-Instruct-v0.3", api_key=key)
        agent = Agent(model=model, markdown=True)
        res = agent.run("Hi")
        print(f"✅ HF Success: {res.content}")
    except Exception as e:
        print(f"❌ HF Failed: {e}")

def test_groq():
    print("\n--- Testing Groq ---")
    key = os.getenv("GROQ_API_KEY")
    if not key:
        print("❌ GROQ_API_KEY missing")
        return
    
    try:
        model = Groq(id="llama-3.3-70b-versatile", api_key=key)
        agent = Agent(model=model, markdown=True)
        res = agent.run("Hi")
        print(f"✅ Groq Success: {res.content}")
    except Exception as e:
        print(f"❌ Groq Failed: {e}")

if __name__ == "__main__":
    test_gemini()
    test_hf()
    test_groq()
