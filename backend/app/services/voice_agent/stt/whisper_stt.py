import whisper
import tempfile
import numpy as np
import soundfile as sf
import logging

logger = logging.getLogger(__name__)

# Lazy load model to avoid blocking startup if possible, or load on import
# For now, load on import as original
try:
    print("Loading Whisper model...")
    model = whisper.load_model("tiny")
    print("Whisper model loaded.")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    model = None

def transcribe_pcm(pcm_bytes: bytes) -> str:
    if not model:
        return ""
    
    try:
        # Convert PCM bytes to float32 numpy array
        # Original: int16 -> float32 / 32768.0
        audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Whisper can process numpy array directly
        result = model.transcribe(audio, language="en", fp16=False)
        
        return result.get("text", "").strip()
    except Exception as e:
        logger.error(f"Transcribe Error: {e}")
        return ""
