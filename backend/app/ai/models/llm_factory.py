import os
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from app.core.config import settings
from langchain_core.runnables import RunnableBinding

def get_llm_with_fallback(temperature=0.7):
    """
    Returns a LangChain Runnable that tries Groq first, then falls back to Gemini.
    Suitable for direct .invoke() calls (Chat, Content Generation).
    """
    # Create Retry Strategy
    # Using RunnableRetry is better, but .with_retry() is cleaner if available in newer versions.
    # We will use standard bind for retries if supported, or basic with_fallbacks chain which is already robust for availability.
    # To add true "Transient Error" retries:
    # Strategy: OpenRouter (Tier 1) -> Groq (Tier 2 fast) -> Gemini (Tier 2 stable)
    
    # 1. Primary: OpenRouter (if key exists)
    primary_llm = None
    if settings.OPENROUTER_API_KEY:
        try:
            primary_llm = ChatOpenAI(
                model="openai/gpt-4o",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=temperature
            )
        except Exception:
            pass

    # 2. Secondary: Groq (Fast Llama 3)
    groq_llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=temperature
    ).with_retry(stop_after_attempt=3)

    # 3. Tertiary: Gemini (Fallback)
    fallbacks = []
    if settings.GOOGLE_API_KEY:
        gemini_llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=temperature,
            convert_system_message_to_human=True,
            max_retries=3
        )
        fallbacks.append(gemini_llm)

    # Chain construction
    if primary_llm:
        # OpenRouter -> Groq -> Gemini
        return primary_llm.with_fallbacks([groq_llm] + fallbacks)
    
    # Groq -> Gemini
    return groq_llm.with_fallbacks(fallbacks)


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
