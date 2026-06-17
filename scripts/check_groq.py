from dotenv import load_dotenv
import os
from langchain_groq import ChatGroq

load_dotenv()

key = os.getenv("GROQ_API_KEY")
print(f"GROQ_API_KEY present: {bool(key)}")
if key:
    print(f"Key preview: {key[:5]}...")

try:
    llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", groq_api_key=key)
    res = llm.invoke("Hello")
    print("Groq Test Success:", res.content)
except Exception as e:
    print("Groq Test Failed:", e)
