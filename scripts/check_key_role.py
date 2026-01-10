import jwt
import sys

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbGJraGdxdWFqbW5xZ2J2Z3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDk1MCwiZXhwIjoyMDY5NDc2OTUwfQ.PsKMfUi4NMv8PY8wBI3o8QhR05ghueIiSrNtTj8J8kw"

try:
    # Decode without verifying signature just to see the payload
    decoded = jwt.decode(token, options={"verify_signature": False})
    print(f"Role: {decoded.get('role')}")
except Exception as e:
    print(f"Error decoding: {e}")
