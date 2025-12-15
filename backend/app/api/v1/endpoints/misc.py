from fastapi import APIRouter
from pydantic import BaseModel
from app.services import tools
from app.core.config import settings

router = APIRouter()

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("/contact")
async def contact_endpoint(request: ContactRequest):
    try:
        subject = f"Contact Form: {request.name}"
        body = f"Name: {request.name}\nEmail: {request.email}\nMessage:\n{request.message}"
        # Send to configured FROM_EMAIL (admin)
        status = tools.send_email(settings.FROM_EMAIL, subject, body)
        return {"success": True, "status": status}
    except Exception as e:
        return {"error": str(e)}

@router.get("/test-email")
def test_email_endpoint(email: str):
    try:
        status = tools.send_email(
            to_email=email,
            subject="Admit AI: Production Test",
            body="Test Email"
        )
        return {"status": "success", "detail": status}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
