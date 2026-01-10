import logging
import json
import time
import uuid
from typing import Any, Dict

class JsonFormatter(logging.Formatter):
    """
    Format logs as JSON with timestamp, level, name, trace_id, and message.
    """
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add trace ID if available (from middleware or context)
        if hasattr(record, 'trace_id'):
            log_obj['trace_id'] = record.trace_id
            
        # Add structured data from 'extra'
        if hasattr(record, 'data'):
            log_obj.update(record.data) # Merge extra data
            
        # Exception handling
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Reset handlers
    if root_logger.handlers:
        root_logger.handlers = []
        
    root_logger.addHandler(handler)
    
    # Silence third-party noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

class AuditLogger:
    """
    Dedicated Logger for Compliance & Audit Trails.
    """
    def __init__(self):
        self.logger = logging.getLogger("audit")
    
    def log_event(self, event_type: str, user_id: str, details: Dict[str, Any], trace_id: str = None):
        """
        Log a critical system event.
        
        Args:
            event_type: e.g., "campaign_launched", "prompt_modified", "model_fallback"
            user_id: The user performing the action
            details: Contextual data (input, output, cost, diff)
            trace_id: Request ID for correlation
        """
        trace_id = trace_id or str(uuid.uuid4())
        
        payload = {
            "event_type": event_type,
            "user_id": user_id,
            "trace_id": trace_id,
            "details": details
        }
        
        # We pass payload as 'extra' dict if using standard logger, 
        # but our JsonFormatter looks for 'data' attribute or direct dict merge if we custom logic.
        # Let's attach it to the record via 'extra' which standard logging supports.
        # However, Python logging 'extra' merges into record.__dict__.
        # My JsonFormatter above checks `record.data`. 
        # So I will pass it as `extra={"data": payload}`.
        
        self.logger.info(
            f"AUDIT-EVENT: {event_type}", 
            extra={"data": payload}
        )

audit_logger = AuditLogger()
