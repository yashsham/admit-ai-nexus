import asyncio
import websockets
import struct

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

async def test_voice_connection():
    uri = "ws://localhost:8000/ws/audio"
    print(f"Attempting connection to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"{GREEN}✅ Connected successfully via WebSocket!{RESET}")
            
            # Send an ID handshake (AudioSocket protocol)
            # Kind 0x01 (ID), Length 16 (UUID bytes, simulated)
            kind = 0x01
            payload = b"1234567890123456" # 16 bytes
            length = len(payload)
            header = struct.pack(">BH", kind, length)
            
            await websocket.send(header + payload)
            print(f"Sent Handshake. Waiting for response or keep alive (2s)...")
            
            # Wait briefly to confirm connection stays open without instant error
            await asyncio.sleep(2)
            print(f"{GREEN}✅ Connection stable.{RESET}")
            
            return True
    except ConnectionRefusedError:
        print(f"{RED}❌ Connection Refused. Is the backend running on port 8000?{RESET}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error: {e}{RESET}")
        return False

if __name__ == "__main__":
    asyncio.run(test_voice_connection())
