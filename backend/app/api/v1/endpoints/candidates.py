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
        content = await file.read()
        decoded_content = content.decode('utf-8')
        
        candidates_to_add = []
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        tags = ["uploaded"]
        if campaign_id:
            tags.append(f"campaign:{campaign_id}")

        for row in csv_reader:
            row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            
            name_key = next((k for k in row.keys() if k in ['name', 'student name', 'full name']), None)
            email_key = next((k for k in row.keys() if k in ['email', 'email address']), None)
            phone_key = next((k for k in row.keys() if k in ['phone', 'mobile']), None)
            
            if not email_key and not phone_key:
                continue

            candidates_to_add.append({
                "user_id": user_id,
                "name": row.get(name_key, "") if name_key else "Unknown",
                "email": row.get(email_key, "") if email_key else "",
                "phone": row.get(phone_key, "") if phone_key else "",
                "tags": tags 
            })
            
        if not candidates_to_add:
            return {"message": "No valid candidates found in CSV"}

        # Optimize: Chunked Inserts (Batch size 1000)
        BATCH_SIZE = 1000
        for i in range(0, len(candidates_to_add), BATCH_SIZE):
            chunk = candidates_to_add[i : i + BATCH_SIZE]
            supabase.table("candidates").insert(chunk).execute()
        
        return {"success": True, "count": len(candidates_to_add), "message": "Candidates uploaded successfully"}

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
