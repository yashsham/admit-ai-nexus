from fastapi import APIRouter, Depends, HTTPException, Request
from app.services.billing import billing_service
from app.security.dependencies import get_current_user, User
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class SubscriptionRequest(BaseModel):
    plan_id: str

@router.post("/subscribe")
async def create_subscription(request: SubscriptionRequest, current_user: User = Depends(get_current_user)):
    try:
        # In a real app, Map internal Plan ID to Razorpay Plan ID
        razorpay_plan_id = "plan_1234567890" # Example ID
        
        subscription = billing_service.create_subscription(razorpay_plan_id)
        
        return subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    # Verify signature and update DB
    try:
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature")
        # Verify logic would go here
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Signature")
