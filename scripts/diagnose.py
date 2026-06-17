
import os
import asyncio
from services.supabase_client import supabase
import csv
import io

async def check_db_schema():
    print("--- Checking Tables ---")
    try:
        # Check 'automations'
        res = supabase.table("automations").select("*").limit(1).execute()
        print(f"Table 'automations' exists. Rows: {len(res.data)}")
    except Exception as e:
        print(f"Table 'automations' ERROR: {e}")

    try:
        # Check 'automation_rules'
        res = supabase.table("automation_rules").select("*").limit(1).execute()
        print(f"Table 'automation_rules' exists. Rows: {len(res.data)}")
    except Exception as e:
        print(f"Table 'automation_rules' ERROR: {e}")

    try:
        # Check 'candidates' columns
        res = supabase.table("candidates").select("*").limit(1).execute()
        if res.data:
            print(f"Candidates columns: {res.data[0].keys()}")
        else:
            print("Candidates table empty, inserting dummy to check columns...")
            # Insert dummy
            dummy = {"user_id": "00000000-0000-0000-0000-000000000000", "name": "Test", "phone": "123"}
            try:
                supabase.table("candidates").insert(dummy).execute()
                print("Inserted dummy candidate.")
                res = supabase.table("candidates").select("*").eq("user_id", "00000000-0000-0000-0000-000000000000").execute()
                print(f"Candidates columns: {res.data[0].keys()}")
                # Clean up
                supabase.table("candidates").delete().eq("user_id", "00000000-0000-0000-0000-000000000000").execute()
            except Exception as e:
                print(f"Failed to insert dummy candidate: {e}")

    except Exception as e:
        print(f"Table 'candidates' ERROR: {e}")

def check_csv_parsing():
    print("\n--- Checking CSV Parsing ---")
    # Simulate the logic in app.py
    csv_content = """Name, Phone
John Doe, 1234567890"""
    
    print(f"Test CSV 1:\n{csv_content}")
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    for row in csv_reader:
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        print(f"Parsed Row 1: {row}")
        print(f"Email extracted: '{row.get('email', '')}' (Expected empty)")

    csv_content_2 = """Name,Email,Phone
Jane Doe, jane@example.com, 0987654321"""
    csv_content_3 = """Student Name, E-mail Address, Mobile
Alice, alice@example.com, 5555555555"""
    print(f"\nTest CSV 3 (Human Headers):\n{csv_content_3}")
    csv_reader = csv.DictReader(io.StringIO(csv_content_3))
    
    # Copy paste logic from app.py to verify
    for r in csv_reader:
        row = {k.strip().lower(): v.strip() for k, v in r.items() if k}
        
        name_key = next((k for k in row.keys() if k in ['name', 'student name', 'full name', 'candidate name']), None)
        email_key = next((k for k in row.keys() if k in ['email', 'e-mail', 'email address', 'mail']), None)
        phone_key = next((k for k in row.keys() if k in ['phone', 'mobile', 'contact', 'phone number', 'whatsapp']), None)

        print(f"Parsed Row 3: {row}")
        print(f"Detected Keys - Name: {name_key}, Email: {email_key}, Phone: {phone_key}")
        print(f"Extracted Email: {row.get(email_key, 'FAIL')}")

if __name__ == "__main__":
    # asyncio.run(check_db_schema()) 
    check_csv_parsing()
