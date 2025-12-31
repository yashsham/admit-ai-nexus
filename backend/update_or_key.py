import os

env_path = r"d:\Admit\.env"
new_key = "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"

try:
    with open(env_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    found = False
    for line in lines:
        if line.strip().startswith("OPENROUTER_API_KEY="):
            new_lines.append(f"OPENROUTER_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
    
    if not found:
        new_lines.append(f"\nOPENROUTER_API_KEY={new_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)
    
    print("✅ .env Updated Successfully with OpenRouter Key")

except Exception as e:
    print(f"❌ Failed: {e}")
