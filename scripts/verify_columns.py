
import os
import sys
import uuid
sys.path.append('d:\\Admit\\backend')
from app import supabase

# Generate a unique test user
user_id = str(uuid.uuid4()) # Valid UUID

# 1. Base Insert (Name/Phone only)
print("1. Testing Base Insert (Name/Phone)...")
try:
    c1 = {"name": "Test Base", "phone": "0000000000", "user_id": user_id}
    res = supabase.table("candidates").insert(c1).execute()
    print("   SUCCESS")
    # Clean up
    supabase.table("candidates").delete().eq("phone", "0000000000").execute()
except Exception as e:
    print(f"   FAILED: {e}")

# 2. Testing Tags
print("2. Testing 'tags' column...")
try:
    c2 = {"name": "Test Tags", "phone": "1111111111", "user_id": user_id, "tags": ["test"]}
    res = supabase.table("candidates").insert(c2).execute()
    print("   SUCCESS - 'tags' exists")
    supabase.table("candidates").delete().eq("phone", "1111111111").execute()
except Exception as e:
    print(f"   FAILED - 'tags' error: {e}")

# 3. Testing Campaign ID
print("3. Testing 'campaign_id' column...")
try:
    # We need a valid uuid? or string? Schema usually uuid.
    cid = str(uuid.uuid4())
    c3 = {"name": "Test CID", "phone": "2222222222", "user_id": user_id, "campaign_id": cid}
    res = supabase.table("candidates").insert(c3).execute()
    print("   SUCCESS - 'campaign_id' exists")
    supabase.table("candidates").delete().eq("phone", "2222222222").execute()
except Exception as e:
    print(f"   FAILED - 'campaign_id' error: {e}")

# 4. Testing 'metadata' (common JSON fallback)
print("4. Testing 'metadata' column...")
try:
    c4 = {"name": "Test Meta", "phone": "3333333333", "user_id": user_id, "metadata": {"campaign_id": "xyz"}}
    res = supabase.table("candidates").insert(c4).execute()
    print("   SUCCESS - 'metadata' exists")
    supabase.table("candidates").delete().eq("phone", "3333333333").execute()
except Exception as e:
    print(f"   FAILED - 'metadata' error: {e}")
