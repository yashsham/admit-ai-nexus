import logging
import json
import time

class JsonFormatter(logging.Formatter):
    """
    Format logs as JSON with timestamp, level, name, and message.
    """
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        if hasattr(record, 'request_id'):
            log_obj['request_id'] = record.request_id
            
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates (e.g. Uvicorn default)
    if root_logger.handlers:
        root_logger.handlers = []
        
    root_logger.addHandler(handler)
    
    # Also silence some loud libraries if needed
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING) # We will log requests ourselves
