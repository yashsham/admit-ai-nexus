
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.core.config import settings
    from sqlalchemy import create_engine, text
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def run_migration():
    print("Attempting to fix database schema...")
    
    # Get DB URL
    db_url = settings.SQLALCHEMY_DATABASE_URI
    if not db_url:
        print("Error: SQLALCHEMY_DATABASE_URI not found in settings.")
        return

    try:
        engine = create_engine(db_url)
        with engine.connect() as connection:
            # 1. Add Status Column
            print("Adding 'status' column...")
            connection.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';"))
            
            # 2. Add Index
            print("Adding index...")
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);"))
            
            # 3. Backfill data based on tags (if any)
            print("Backfilling data from tags...")
            connection.execute(text("UPDATE candidates SET status = 'interested' WHERE tags LIKE '%interested%';"))
            
            connection.commit()
            print("Schema fixed successfully!")
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    run_migration()
