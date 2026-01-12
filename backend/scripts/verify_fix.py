
try:
    from google.genai.types import FileSearch
    print("SUCCESS: FileSearch imported successfully!")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"FAILURE: Unexpected error: {e}")

try:
    import agno
    print(f"Agno version: {agno.__version__}")
except ImportError:
    print("Agno not found")

import google.genai
print(f"Google GenAI version: {google.genai.__version__}")
