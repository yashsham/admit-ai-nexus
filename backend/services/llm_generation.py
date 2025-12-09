import os
from crewai import LLM
from dotenv import load_dotenv

load_dotenv()

def generate_personalized_content(candidate: dict, prompt: str, channel: str) -> str:
    """
    Generates a unique message for a specific candidate based on the user's prompt.
    """
    # Lazy Init to ensure Env Vars are loaded
    llm = LLM(
        model="groq/llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY")
    )
    
    # safe defaults
    name = candidate.get("name", "Student")
    city = candidate.get("city", "your city")
    course = candidate.get("course", "our programs")
    
    # Construct a specific prompt for the LLM
    system_instruction = f"""
    You are an expert Admissions Counselor. 
    Your goal is to write a SHORT, Personalized {channel} message.
    
    Recipient Profile:
    - Name: {name}
    - City: {city}
    - Interest: {course}
    
    User Instructions: "{prompt}"
    
    Constraints:
    - Strict limit: Under 160 characters for WhatsApp, under 50 words for Voice/Email.
    - No emojis unless asked.
    - RETURN ONLY THE MESSAGE CONTENT. Do not include "Here is the message:" or quotes.
    """
    
    try:
        response = llm.call(
            messages=[{"role": "user", "content": system_instruction}]
        )
        return response.strip().strip('"')
    except Exception as e:
        print(f"LLM Generation Error for {name}: {e}")
        # Fallback if LLM fails
        return f"Hi {name}, regarding your interest in {course}. Please contact us."
