import os
from dotenv import load_dotenv
from phi.agent import Agent
from phi.model.google import Gemini
from phi.model.huggingface import HuggingFaceChat

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

def test():
    print("--- Testing Gemini 2.0 Flash ---")
    try:
        # Trying a model ID explicitly listed in the previous step
        model = Gemini(id="models/gemini-2.0-flash", api_key=os.getenv("GOOGLE_API_KEY"))
        agent = Agent(model=model, markdown=True)
        print(agent.run("Hi").content)
        print("✅ Gemini 2.0 Working!")
    except Exception as e:
        print(f"❌ Gemini Failed: {e}")

    print("\n--- Testing Hugging Face ---")
    try:
        model = HuggingFaceChat(id="mistralai/Mistral-7B-Instruct-v0.3", api_key=os.getenv("HUGGINGFACE_API_KEY"))
        agent = Agent(model=model, markdown=True)
        print(agent.run("Hi").content)
        print("✅ HF Working!")
    except Exception as e:
        print(f"❌ HF Failed: {e}")

if __name__ == "__main__":
    test()
