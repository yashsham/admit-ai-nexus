path = "d:/Admit/backend/.env"
try:
    with open(path, "r", encoding='utf-8') as f:
        content = f.read()
    
    # Check if the error pattern exists
    if '"SUPABASE_SERVICE_ROLE_KEY=' in content:
        print("Found error pattern. Fixing...")
        new_content = content.replace('"SUPABASE_SERVICE_ROLE_KEY=', '"\nSUPABASE_SERVICE_ROLE_KEY=')
        
        with open(path, "w", encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed.")
    else:
        print("Pattern not found. Checking alternate...")
        # Fallback for keys without quotes or other patterns
        import re
        # Look for KEY=VALUEKEY=VALUE pattern
        fixed = re.sub(r'([a-zA-Z0-9_]+=[^\n]+?)(SUPABASE_SERVICE_ROLE_KEY=)', r'\1\n\2', content)
        if fixed != content:
             with open(path, "w", encoding='utf-8') as f:
                f.write(fixed)
             print("Fixed with regex.")
        else:
            print("No fix needed or pattern unknown.")

except Exception as e:
    print(f"Error: {e}")
