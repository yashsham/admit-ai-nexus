from fastapi import APIRouter
from app.api.v1.endpoints import campaigns, candidates, analytics, health, misc, billing

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(misc.router, tags=["misc"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
from app.api.v1.endpoints import chat
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

from app.api.v1.endpoints import inbound_webhook
api_router.include_router(inbound_webhook.router, tags=["webhooks"])
