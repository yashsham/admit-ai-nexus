from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from contextvars import ContextVar

# Context Var to hold current Org ID
org_context: ContextVar[str] = ContextVar("org_context", default=None)

class MultiTenancyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract Org ID from Header
        org_id = request.headers.get("X-Organization-ID")
        
        token = org_context.set(org_id)
        try:
            response = await call_next(request)
            return response
        finally:
            org_context.reset(token)

def get_current_org_id():
    return org_context.get()
