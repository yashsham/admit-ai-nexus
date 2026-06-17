import os

def list_keys(path):
    if not os.path.exists(path):
        return "MISSING"
    keys = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split('=')
                if len(parts) > 0:
                    keys.append(parts[0].strip())
    return keys

backend_keys = list_keys("d:/Admit/backend/.env")
print(f"Keys in Backend .env: {backend_keys}")
