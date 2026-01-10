import os

def fix_env():
    env_path = ".env"
    if not os.path.exists(env_path):
        print(".env not found")
        return

    with open(env_path, "r") as f:
        lines = f.readlines()

    env_map = {}
    new_lines = []
    
    for line in lines:
        new_lines.append(line)
        if "=" in line and not line.strip().startswith("#"):
            key, val = line.strip().split("=", 1)
            env_map[key] = val

    keys_to_sync = [
        ("GROQ_API_KEY", "VITE_GROQ_API_KEY"),
        ("TAVILY_API_KEY", "VITE_TAVILY_API_KEY"),
        ("LANGCHAIN_API_KEY", "VITE_LANGCHAIN_API_KEY"),
        ("LANGCHAIN_PROJECT", "VITE_LANGCHAIN_PROJECT"),
        ("LANGCHAIN_TRACING_V2", "VITE_LANGCHAIN_TRACING_V2"),
        ("SUPABASE_URL", "VITE_SUPABASE_URL"),
        ("SUPABASE_KEY", "VITE_SUPABASE_ANON_KEY") 
    ]
    
    updates = []
    for backend_key, frontend_key in keys_to_sync:
        if backend_key in env_map:
            if frontend_key not in env_map:
                print(f"Adding missing {frontend_key}...")
                updates.append(f"\n{frontend_key}={env_map[backend_key]}\n")
            elif env_map[frontend_key] != env_map[backend_key]:
                 print(f"Updating {frontend_key} to match {backend_key}...")
                 # This is harder to patch in place without rewriting whole file correctly handling newlines
                 # For now, just appending correct one usually overrides in dotenv, but safer to warn.
                 # Let's just append the Correct one at the end.
                 updates.append(f"\n{frontend_key}={env_map[backend_key]}\n")

    if updates:
        with open(env_path, "a") as f:
            for update in updates:
                f.write(update)
        print("Updated .env file with VITE_ keys.")
    else:
        print("All VITE_ keys present and matching.")

if __name__ == "__main__":
    fix_env()
