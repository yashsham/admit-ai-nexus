import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# Force load .env
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
print(f"API Key present: {bool(api_key)}")
if api_key:
    print(f"API Key prefix: {api_key[:5]}...")

try:
    print("Initializing ChatGroq...")
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        temperature=0.7
    )
    
    print("Invoking LLM...")
    response = llm.invoke("Say 'Hello from Groq!' if you can hear me.")
    print("Response received:")
    print(response.content)
    
except Exception as e:
    print(f"LLM Error: {e}")
