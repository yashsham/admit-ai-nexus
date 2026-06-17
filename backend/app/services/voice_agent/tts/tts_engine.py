import pyttsx3
import tempfile
import soundfile as sf
import os
import logging

logger = logging.getLogger(__name__)

# Initialize engine inside function or global? Global is better for pyttsx3 usually, 
# but it must be run on main loop if not careful. 
# Re-initializing per call might be safer for threading if pyttsx3 supports it.
# Original code had global engine.

try:
    engine = pyttsx3.init()
    engine.setProperty("rate", 165)
except Exception as e:
    logger.error(f"Failed to init TTS engine: {e}")
    engine = None

def synthesize_speech(text: str) -> bytes:
    if not engine:
        return b""
        
    # Create temp file and close it immediately so other libs can open it
    f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    f.close()
    temp_path = f.name
    
    # logger.info(f"Synthesizing: {text[:20]}...")
    try:
        # pyttsx3 writes to the file
        # Note: runAndWait() triggers the event loop. In async context this might block.
        # Ideally run in executor.
        engine.save_to_file(text, temp_path)
        engine.runAndWait()
        
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            # soundfile reads the file
            data, _ = sf.read(temp_path, dtype="int16")
            # logger.info(f"TTS Success: {len(data)} samples")
            return data.tobytes()
        else:
            logger.error(f"TTS Error: File {temp_path} is empty or not created.")
            return b""
            
    except Exception as e:
        logger.error(f"TTS Exception: {e}")
        return b""
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
