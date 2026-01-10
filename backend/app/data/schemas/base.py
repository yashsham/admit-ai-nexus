from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Optional
from datetime import datetime

class AppBaseModel(BaseModel):
    """
    Base Pydantic model for all schemas.
    Includes common configuration.
    """
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class JSONResponse(BaseModel):
    """Standard API Response Wrapper"""
    success: bool = True
    message: str
    data: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    code: str = "INTERNAL_ERROR"
