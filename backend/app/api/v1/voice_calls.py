from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.retell_service import retell_service
from app.data.supabase_client import supabase
from app.security.dependencies import get_current_user, User

router = APIRouter()

class CallRequest(BaseModel):
    candidate_id: Optional[str] = None
    phone_number: str
    candidate_name: str
    context: Optional[str] = None
    document_content: Optional[str] = None

@router.post("/call-candidate")
async def call_candidate(request: CallRequest, current_user: User = Depends(get_current_user)):
    """
    Triggers a Retell AI voice call for a specific candidate.
    """
    try:
        # 1. Trigger the call
        result = retell_service.trigger_outbound_call(
            phone_number=request.phone_number,
            candidate_name=request.candidate_name,
            context=request.context,
            document_content=request.document_content,
            metadata={"candidate_id": request.candidate_id, "user_id": current_user.id}
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to trigger call"))

        # 2. Update candidate status in Supabase if candidate_id provided
        if request.candidate_id:
            supabase.table("candidates").update({
                "status": "voice_called",
                "last_call_id": result["call_id"]
            }).eq("id", request.candidate_id).execute()

        return {
            "success": True, 
            "message": f"Call triggered successfully for {request.candidate_name}",
            "call_id": result["call_id"]
        }

    except Exception as e:
        print(f"API Call Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
