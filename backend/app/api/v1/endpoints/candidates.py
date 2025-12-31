from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import csv
import io
from app.services.supabase_client import supabase

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
