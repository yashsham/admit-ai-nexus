import os
import io
import wave
import logging
from groq import Groq

logger = logging.getLogger(__name__)

# Initialize Groq client
client = None
api_key = os.getenv("GROQ_API_KEY")
if api_key:
    try:
        client = Groq(api_key=api_key)
        print("Groq client for STT initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")

def transcribe_pcm(pcm_bytes: bytes) -> str:
    """
    Transcribes PCM bytes by converting to WAV and sending to Groq's Whisper API.
    """
    if not client:
        logger.error("Groq client not initialized. Cannot transcribe.")
        return ""
    
    try:
        # Convert PCM to WAV format in memory for Groq API
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2) # 16-bit
            wf.setframerate(16000) # Match sample rate
            wf.writeframes(pcm_bytes)
        
        buffer.seek(0)
        # Give the buffer a name so Groq knows what kind of file it is
        buffer.name = "audio.wav"
        
        # Use Groq's Whisper API
        transcription = client.audio.transcriptions.create(
            file=buffer,
            model="whisper-large-v3",
            language="en",
            response_format="text",
        )
        
        return str(transcription).strip()
    except Exception as e:
        logger.error(f"Groq Transcribe Error: {e}")
        return ""

