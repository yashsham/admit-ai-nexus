import os

env_path = r"d:\Admit\.env"
new_key = "AIzaSyCmL2bMx3OYu989J9O9fuct0HPdevGBbW0"

try:
    with open(env_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    found = False
    for line in lines:
        if line.strip().startswith("GOOGLE_API_KEY="):
            new_lines.append(f"GOOGLE_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
    
    if not found:
        new_lines.append(f"\nGOOGLE_API_KEY={new_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)
    
    print("✅ .env Updated Successfully")

except Exception as e:
    print(f"❌ Failed: {e}")
