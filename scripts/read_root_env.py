try:
    with open("d:/Admit/.env", "r", encoding='utf-8') as f:
        print(f.read())
except Exception as e:
    print(e)
