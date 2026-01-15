from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import csv
import io
import asyncio
from app.data.supabase_client import supabase
from app.security.dependencies import get_current_user, User

router = APIRouter()

class CandidateBatchRequest(BaseModel):
    user_id: str
    campaign_id: Optional[str] = None
    candidates: List[Dict[str, Any]]

@router.post("/upload")
async def upload_candidates(user_id: str = Form(...), campaign_id: Optional[str] = Form(None), file: UploadFile = File(...)):
    print(f"Uploading candidates for user: {user_id} (Campaign: {campaign_id})")
    try:
        # Optimization: Stream Processing (O(1) Memory)
        import codecs
        stream_reader = codecs.getreader("utf-8")(file.file)
        csv_reader = csv.reader(stream_reader)
        
        # Read header row
        try:
            headers = next(csv_reader)
        except StopIteration:
            return {"message": "Empty CSV file"}
            
        # Optimization: Pre-compute Header Map (O(K) Time)
        headers_lower = [h.strip().lower() for h in headers]
        header_map = {} # Mapping of standard keys to index
        
        # Find indices once
        for idx, col in enumerate(headers_lower):
            if col in ['name', 'student name', 'full name']:
                header_map['name'] = idx
            elif col in ['email', 'email address']:
                header_map['email'] = idx
            elif col in ['phone', 'mobile']:
                header_map['phone'] = idx
        
        candidates_to_add = []
        tags = ["uploaded"]
        if campaign_id:
            tags.append(f"campaign:{campaign_id}")
            
        BATCH_SIZE = 1000
        total_count = 0

        # Process rows (O(N) Time)
        for row in csv_reader:
            if not row: continue
            
            # Direct index access (O(1) Time)
            name = row[header_map['name']] if 'name' in header_map and len(row) > header_map['name'] else "Unknown"
            email = row[header_map['email']] if 'email' in header_map and len(row) > header_map['email'] else ""
            phone = row[header_map['phone']] if 'phone' in header_map and len(row) > header_map['phone'] else ""
            
            if not email and not phone:
                continue

            candidates_to_add.append({
                "user_id": user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "tags": tags 
            })
            
            # Chunked Inserts logic within loop to keep memory low
            if len(candidates_to_add) >= BATCH_SIZE:
                supabase.table("candidates").insert(candidates_to_add).execute()
                total_count += len(candidates_to_add)
                candidates_to_add = [] # Clear buffer

        # Insert remaining
        if candidates_to_add:
            supabase.table("candidates").insert(candidates_to_add).execute()
            total_count += len(candidates_to_add)
        
        return {"success": True, "count": total_count, "message": "Candidates uploaded successfully"}

    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def batch_upload_candidates(request: CandidateBatchRequest):
    try:
        candidates_to_add = []
        for c in request.candidates:
             if not c.get("name") or not c.get("phone"):
                 continue
                 
             tags = ["uploaded", "batch"]
             if request.campaign_id:
                 tags.append(f"campaign:{request.campaign_id}")

             candidates_to_add.append({
                "user_id": request.user_id,
                "name": c.get("name", "Unknown"),
                "email": c.get("email", ""),
                "phone": c.get("phone", ""),
                "tags": tags
            })
            
        if not candidates_to_add:
            return {"message": "No valid candidates to add"}
            
        supabase.table("candidates").insert(candidates_to_add).execute()
        
        if request.campaign_id:
             try:
                 camp_res = supabase.table("campaigns").select("candidates_count").eq("id", request.campaign_id).single().execute()
                 if camp_res.data:
                     new_count = (camp_res.data.get("candidates_count", 0) or 0) + len(candidates_to_add)
                     supabase.table("campaigns").update({"candidates_count": new_count}).eq("id", request.campaign_id).execute()
             except Exception:
                 pass
        
        return {"success": True, "count": len(candidates_to_add), "message": "Candidates uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- New Optimized Endpoints for Thin Frontend ---

@router.get("/distribution/stats")
async def get_distribution_stats(current_user: User = Depends(get_current_user)):
    """
    Returns aggregated stats for the Data Distribution Layer.
    Moves O(N) filtering from client to backend (or DB).
    """
    try:
        # We can run these in parallel
        # 1. Total
        f_total = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).execute())
        
        # 2. Ready (pending)
        f_ready = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).eq("status", "pending").execute())
        
        # 3. In Progress (sent/called) - using 'in_' if possible or separate queries.
        # Supabase-py 'in_' matches if column value is in list.
        # statuses: email_sent, voice_called, whatsapp_sent
        f_in_progress = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).in_("status", ["email_sent", "voice_called", "whatsapp_sent"]).execute())
        
        # 4. Completed (response_received = true OR status = responded/completed)
        # Assuming 'response_received' boolean column based on frontend use, OR status check
        # Frontend used: c.response_received (boolean)
        f_completed = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).eq("response_received", True).execute())
        
        # 5. Failed
        f_failed = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).eq("status", "failed").execute())

        results = await asyncio.gather(f_total, f_ready, f_in_progress, f_completed, f_failed, return_exceptions=True)
        
        def get_count(res):
            if isinstance(res, Exception): return 0
            return res.count if hasattr(res, 'count') and res.count is not None else 0

        return {
            "totalCandidates": get_count(results[0]),
            "readyForDistribution": get_count(results[1]),
            "inProgress": get_count(results[2]),
            "completed": get_count(results[3]),
            "failed": get_count(results[4])
        }
    except Exception as e:
        print(f"Stats Error: {e}")
        # Return zeros on error to prevent frontend crash
        return {"totalCandidates": 0, "readyForDistribution": 0, "inProgress": 0, "completed": 0, "failed": 0}

@router.get("/distribution/list")
async def get_candidates_list(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Returns paginated and filtered candidates list.
    """
    try:
        start = (page - 1) * limit
        end = start + limit - 1
        
        query = supabase.table("candidates").select("*, campaigns(name, type, status)").eq("user_id", current_user.id)
        
        if status and status != "all":
            query = query.eq("status", status)
            
        if search:
            # Simple ILIKE search on name or email
            # Supabase doesn't support OR across columns easily in one chained call without 'or' syntax:
            # .or_('name.ilike.%search%,email.ilike.%search%')
            term = f"%{search}%"
            query = query.or_(f"name.ilike.{term},email.ilike.{term},phone.ilike.{term},city.ilike.{term}")
            
        query = query.order("created_at", desc=True).range(start, end)
        
        response = query.execute()
        
        return {
            "data": response.data,
            "page": page,
            "hasMore": len(response.data) == limit
        }
    except Exception as e:
        print(f"List Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
