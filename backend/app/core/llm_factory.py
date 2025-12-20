import os
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings
from langchain_core.runnables import RunnableBinding

def get_llm_with_fallback(temperature=0.7):
    """
    Returns a LangChain Runnable that tries Groq first, then falls back to Gemini.
    Suitable for direct .invoke() calls (Chat, Content Generation).
    """
    # Primary: Groq
    groq_llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=temperature
    )
    
    # Secondary: Gemini
    # Note: Requires GOOGLE_API_KEY in settings
    if settings.GOOGLE_API_KEY:
        gemini_llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=temperature,
            convert_system_message_to_human=True # Gemini sometimes needs this
        )
        # Create Fallback
        return groq_llm.with_fallbacks([gemini_llm])
    
    return groq_llm

def get_crewai_llm(temperature=0.7):
    """
    Returns a specific LLM object for CrewAI Agents.
    Uses crewai.LLM class which supports Groq via 'groq/...' model string.
    """
    from crewai import LLM
    
    # 1. Try Groq
    try:
        # CrewAI expects model to be "provider/model_name"
        return LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            temperature=temperature
        )
    except Exception as e:
        print(f"Error initializing Groq for Crew: {e}")
        if settings.GOOGLE_API_KEY:
             return LLM(
                model="gemini/gemini-pro",
                api_key=settings.GOOGLE_API_KEY,
                temperature=temperature
            )
        raise e
