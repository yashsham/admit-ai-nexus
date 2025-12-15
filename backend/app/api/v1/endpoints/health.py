from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok", 
        "service": settings.PROJECT_NAME, 
        "mode": settings.ENVIRONMENT
    }
