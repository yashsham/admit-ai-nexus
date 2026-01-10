try:
    with open("d:/Admit/backend/.env", "r", encoding='utf-8') as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        print("Last 5 lines:")
        for i, line in enumerate(lines[-5:]):
            print(f"{len(lines)-5+i+1}: {repr(line)}")
except Exception as e:
    print(f"Error: {e}")
