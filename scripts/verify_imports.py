import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

print("--- Verifying Imports ---")
try:
    from app.main import app
    print("✅ SUCCESS: app.main imported successfully.")
except ImportError as e:
    print(f"X IMPORT ERROR: {e}")
except Exception as e:
    print(f"X RUNTIME ERROR: {e}")
