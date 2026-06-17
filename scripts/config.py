import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    # Fallback to anon key ONLY for read-only checks, but warn loudly
    # Actually, for this backend, we MUST have service role.
    print("WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Operations requiring write access will fail due to RLS.")
    print("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.")
    # Attempt fallback to help user debug, but it will fail on writes
    SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

# Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY")

# Force CrewAI to use Groq by masquerading as OpenAI
os.environ["OPENAI_API_KEY"] = GROQ_API_KEY
os.environ["OPENAI_API_BASE"] = "https://api.groq.com/openai/v1"
os.environ["OPENAI_BASE_URL"] = "https://api.groq.com/openai/v1"
os.environ["OPENAI_MODEL_NAME"] = "llama-3.3-70b-versatile"

# Marketing Channels (Real Integrations)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# WhatsApp Cloud API (Official)
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@admitai.com")

VOICE_API_KEY = os.getenv("VOICE_API_KEY") # Placeholder for specific voice provider (e.g. Bland AI, Retell)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
