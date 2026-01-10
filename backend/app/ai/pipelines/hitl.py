from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from app.data.supabase_client import supabase
from app.observability.logging import audit_logger

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class HITLManager:
    """
    Manages Human-in-the-Loop workflows.
    
    Patterns:
    1. review_before_action: Blocking call, creates DB record, waits for API callback.
    2. review_after_action: Async audit queue.
    3. confidence_trigger: Conditional review.
    """
    
    async def create_approval_request(
        self, 
        user_id: str, 
        action_type: str, 
        payload: Dict[str, Any],
        confidence_score: float = 1.0,
        trigger_threshold: float = 0.8
    ) -> Dict[str, Any]:
        """
        Evaluates if manual approval is needed.
        Returns: { "requires_approval": bool, "request_id": str }
        """
        
        # 1. Confidence Check
        if confidence_score >= trigger_threshold:
            # High confidence, auto-approve (unless strict policy)
            # In strictly regulated features (e.g. money), threshold might be 1.0
            audit_logger.log_event("auto_approve", user_id, {"action": action_type, "confidence": confidence_score})
            return {"requires_approval": False, "request_id": None}
            
        # 2. Create DB Record (Pending)
        try:
             # Assuming 'approvals' table exists (if not, we'd create it)
             # Schema: id, user_id, action_type, payload, status, created_at
             res = supabase.table("approvals").insert({
                 "user_id": user_id,
                 "action_type": action_type,
                 "payload": payload,
                 "status": ApprovalStatus.PENDING,
                 "confidence_score": confidence_score,
                 "created_at": datetime.now().isoformat()
             }).execute()
             
             if res.data:
                 req_id = res.data[0]['id']
                 audit_logger.log_event("approval_requested", user_id, {"action": action_type, "request_id": req_id})
                 return {"requires_approval": True, "request_id": req_id}
                 
        except Exception as e:
            # Fail safe: Block action if approval system fails
            audit_logger.log_event("approval_system_error", user_id, {"error": str(e)})
            raise RuntimeError(f"Approval System Failure: {e}")
            
        return {"requires_approval": True, "request_id": "mock_id"}

    async def approve_request(self, request_id: str, reviewer_id: str, decision: ApprovalStatus, feedback: str = None):
        """
        Called by API when human reviews the item.
        """
        # Update DB
        res = supabase.table("approvals").update({
            "status": decision,
            "reviewer_id": reviewer_id,
            "reviewed_at": datetime.now().isoformat(),
            "feedback": feedback
        }).eq("id", request_id).execute()
        
        audit_logger.log_event(f"manual_{decision}", reviewer_id, {"request_id": request_id, "feedback": feedback})
        return res.data

hitl_manager = HITLManager()
