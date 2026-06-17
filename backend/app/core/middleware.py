import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from contextvars import ContextVar

# Context Var to hold current Org ID and Request ID
org_context: ContextVar[str] = ContextVar("org_context", default=None)
request_id_context: ContextVar[str] = ContextVar("request_id_context", default=None)

logger = logging.getLogger("api.middleware")

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

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = str(uuid.uuid4())
        token = request_id_context.set(request_id)
        
        # Inject Request ID into logger context (if supported) or just log it
        # For simple JSON formatter, we can rely on thread locals or just passing it
        
        try:
            response = await call_next(request)
            
            process_time = (time.time() - start_time) * 1000
            
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "latency_ms": round(process_time, 2),
                "user_agent": request.headers.get("user-agent"),
            }
            
            logger.info(f"Request Processed: {log_data}")
            
            # Inject X-Request-ID header
            response.headers["X-Request-ID"] = request_id
            return response
            
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(f"Request Failed: {e}", extra={"request_id": request_id})
            raise e
        finally:
            request_id_context.reset(token)

def get_current_org_id():
    return org_context.get()

def get_current_request_id():
    return request_id_context.get()
