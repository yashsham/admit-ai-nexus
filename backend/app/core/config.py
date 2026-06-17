import os
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv

from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv() # Fallback to local .env if any

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Admit AI Nexus"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database (Supabase)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or ""
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or ""
    SUPABASE_ANON_KEY: str = os.getenv("VITE_SUPABASE_ANON_KEY", "")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # LLM (Groq & Gemini)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY") or ""
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY") or ""
    
    # Marketing Integrations
    SENDGRID_API_KEY: Optional[str] = os.getenv("SENDGRID_API_KEY")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@admitai.com")
    
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_API_KEY_SID: Optional[str] = os.getenv("TWILIO_API_KEY_SID")
    TWILIO_API_KEY_SECRET: Optional[str] = os.getenv("TWILIO_API_KEY_SECRET")
    TWILIO_PHONE_NUMBER: Optional[str] = os.getenv("TWILIO_PHONE_NUMBER")
    
    WHATSAPP_ACCESS_TOKEN: Optional[str] = os.getenv("WHATSAPP_ACCESS_TOKEN")
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    
    RETELL_API_KEY: Optional[str] = os.getenv("RETELL_API_KEY")
    RETELL_AGENT_ID: Optional[str] = os.getenv("RETELL_AGENT_ID")
    
    TAVILY_API_KEY: Optional[str] = os.getenv("TAVILY_API_KEY")
    SERPER_API_KEY: Optional[str] = os.getenv("SERPER_API_KEY")
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY")
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY")

    # Email (Internal Logic)
    GMAIL_USER: Optional[str] = os.getenv("GMAIL_USER")
    GMAIL_USER: Optional[str] = os.getenv("GMAIL_USER")
    GMAIL_APP_PASSWORD: Optional[str] = os.getenv("GMAIL_APP_PASSWORD")

    # Billing (Razorpay)
    RAZORPAY_KEY_ID: Optional[str] = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: Optional[str] = os.getenv("RAZORPAY_KEY_SECRET")

    # Asterisk (Voice)
    ASTERISK_HOST: Optional[str] = os.getenv("ASTERISK_HOST")
    ASTERISK_PORT: Optional[int] = os.getenv("ASTERISK_PORT")
    ASTERISK_USER: Optional[str] = os.getenv("ASTERISK_USER")
    ASTERISK_PASS: Optional[str] = os.getenv("ASTERISK_PASS")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
