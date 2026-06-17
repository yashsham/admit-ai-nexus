import struct
import uuid
import logging
import asyncio
import webrtcvad
import collections

# Updated Imports for Backend Structure
from app.services.voice_agent.stt.whisper_stt import transcribe_pcm
from app.services.voice_agent.tts.tts_engine import synthesize_speech
from app.services.voice_agent.agent.admit_voice_agent import handle_user_text
from app.services.voice_agent.state.session import CallSession

# AudioSocket Message Types
KIND_HANGUP = 0x00
KIND_ID = 0x01
KIND_SLIN = 0x10
KIND_ERROR = 0xff

SAMPLE_RATE = 16000
FRAME_DURATION_MS = 20
BYTES_PER_SAMPLE = 2
FRAME_SIZE_BYTES = int(SAMPLE_RATE * (FRAME_DURATION_MS / 1000.0) * BYTES_PER_SAMPLE) # 320 samples * 2 = 640 bytes

# VAD Parameters
VAD_MODE = 3 # 0-3, 3 is most aggressive in filtering non-speech
SILENCE_THRESHOLD_MS = 1000 # Wait 1s of silence before processing
SPEECH_PAD_MS = 300 # Keep 300ms before speech starts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def send_audiosocket_msg(ws, kind: int, payload: bytes):
    """Sends a framed AudioSocket message."""
    length = len(payload)
    header = struct.pack(">BH", kind, length)
    await ws.send_bytes(header + payload)

class VADHandler:
    def __init__(self):
        self.vad = webrtcvad.Vad(VAD_MODE)
        self.triggered = False
        self.buffer = b"" # Buffer for incoming raw bytes to make full frames
        self.ring_buffer = collections.deque(maxlen=SPEECH_PAD_MS // FRAME_DURATION_MS)
        self.speech_frames = []
        self.silence_frames_count = 0
        self.silence_threshold_frames = SILENCE_THRESHOLD_MS // FRAME_DURATION_MS
        
    def process_audio(self, chunk: bytes):
        """
        Process raw audio chunk. Returns valid speech audio if a phrase is complete, else None.
        """
        self.buffer += chunk
        
        result_audio = None
        
        while len(self.buffer) >= FRAME_SIZE_BYTES:
            frame = self.buffer[:FRAME_SIZE_BYTES]
            self.buffer = self.buffer[FRAME_SIZE_BYTES:]
            
            try:
                is_speech = self.vad.is_speech(frame, SAMPLE_RATE)
            except Exception:
                is_speech = False
            
            if not self.triggered:
                self.ring_buffer.append((frame, is_speech))
                
                # Check if we should trigger (simple logic: prompt trigger)
                # If we have enough speech frames in ring buffer, trigger
                num_voiced = len([f for f, s in self.ring_buffer if s])
                if num_voiced > len(self.ring_buffer) * 0.9 and len(self.ring_buffer) > 5: # 90% speech in buffer
                     self.triggered = True
                     # Include the ring buffer in the speech frames
                     for f, s in self.ring_buffer:
                         self.speech_frames.append(f)
                     self.ring_buffer.clear()
                     logger.info("Speech detected. Recording...")
            else:
                self.speech_frames.append(frame)
                
                if not is_speech:
                    self.silence_frames_count += 1
                else:
                    self.silence_frames_count = 0 # Reset if we hear speech
                    
                if self.silence_frames_count >= self.silence_threshold_frames:
                    # Silence threshold reached, end of speech
                    self.triggered = False
                    self.silence_frames_count = 0
                    logger.info("Silence detected. Processing...")
                    
                    full_audio = b"".join(self.speech_frames)
                    self.speech_frames = []
                    result_audio = full_audio
        
        return result_audio

async def audio_ws_handler(ws):
    await ws.accept()
    session = CallSession()
    vad_handler = VADHandler()
    
    stream_buffer = b""
    call_uuid = str(uuid.uuid4())
    logger.info(f"New connection. Default UUID: {call_uuid}")

    try:
        while True:
            chunk = await ws.receive_bytes()
            stream_buffer += chunk

            while len(stream_buffer) >= 3:
                kind = stream_buffer[0]
                length = struct.unpack(">H", stream_buffer[1:3])[0]

                if len(stream_buffer) < 3 + length:
                    break

                payload = stream_buffer[3 : 3 + length]
                stream_buffer = stream_buffer[3 + length :]

                if kind == KIND_ID:
                    call_uuid = payload.hex()
                    logger.info(f"Handshake: Call UUID {call_uuid}")

                elif kind == KIND_HANGUP:
                    logger.info("Hangup received")
                    return

                elif kind == KIND_SLIN:
                    # Feed audio to VAD Handler
                    speech_audio = vad_handler.process_audio(payload)
                    
                    if speech_audio:
                        logger.info(f"Captured {len(speech_audio)} bytes of speech")
                        # 1. STT (Offload to thread to verify non-blocking)
                        text = await asyncio.to_thread(transcribe_pcm, speech_audio)
                        
                        if text and text.strip():
                            logger.info(f"User said: {text}")
                            
                            # 2. Agent Logic (Internet bound, native async usually better, but Groq client is sync here?)
                            reply = await asyncio.to_thread(handle_user_text, text, session)
                            logger.info(f"Agent reply: {reply}")
                            
                            session.history.append(f"User: {text}")
                            session.history.append(f"Agent: {reply}")

                            # 3. TTS (Blocking, move to thread)
                            tts_audio = await asyncio.to_thread(synthesize_speech, reply)
                            
                            if tts_audio:
                                logger.info(f"TTS generated {len(tts_audio)} bytes")
                                
                                # Stream TTS back
                                chunk_size = 320
                                for i in range(0, len(tts_audio), chunk_size):
                                    tts_chunk = tts_audio[i : i + chunk_size]
                                    await send_audiosocket_msg(ws, KIND_SLIN, tts_chunk)
                                    # Basic flow control: if we send too fast, buffers might overflow 
                                    # but AudioSocket usually handles it.
                                    await asyncio.sleep(0.005) # Small pacing
                            else:
                                 logger.warning("TTS returned no audio")
                        else:
                            logger.info("No text transcribed.")

                elif kind == KIND_ERROR:
                    logger.error(f"AudioSocket Error: {payload}")

    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        import traceback
        traceback.print_exc()
