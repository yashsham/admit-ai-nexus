import os

def get_key(path):
    if not os.path.exists(path):
        return "MISSING"
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith("GROQ_API_KEY"):
                parts = line.split('=')
                if len(parts) > 1:
                    val = parts[1].strip().strip('"').strip("'")
                    return f"{val[:5]}...{val[-4:]}" if val else "EMPTY"
    return "NOT_FOUND"

root_key = get_key("d:/Admit/.env")
backend_key = get_key("d:/Admit/backend/.env")

print(f"Root .env Key:    {root_key}")
print(f"Backend .env Key: {backend_key}")
