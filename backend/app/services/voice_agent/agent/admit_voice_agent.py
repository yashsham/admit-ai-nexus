import os
import logging
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

client = None
api_key = os.getenv("GROQ_API_KEY")
if api_key:
    try:
        client = Groq(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")

SYSTEM_PROMPT = """You are an intelligent Voice Assistant for 'Admit AI Nexus', an AI-powered admission platform.
Your goal is to help students with course inquiries, fees, and college information.
Keep your responses concise (1-2 sentences) as they will be spoken out loud.
Be professional, warm, and helpful.
Do not use markdown formatting or emojis, just plain text."""

def handle_user_text(user_text: str, session) -> str:
    """
    Generates a response using Groq based on the user's text and session history.
    """
    if not client:
        return "System error: Groq API key is missing. Please check your configuration."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Reconstruct conversation from session history
    # stored as ["User: ...", "Agent: ..."]
    for item in session.history:
        if item.startswith("User: "):
            messages.append({"role": "user", "content": item[6:]})
        elif item.startswith("Agent: "):
            messages.append({"role": "assistant", "content": item[7:]})
            
    # Add current
    messages.append({"role": "user", "content": user_text})

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=150,
        )
        response = completion.choices[0].message.content
        return response
    except Exception as e:
        logger.error(f"Groq generation error: {e}")
        return "I'm having trouble connecting to my brain right now. Please try again later."
