from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
from app.security.service import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class User(BaseModel):
    id: str
    email: str

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validates the JWT token using AuthService and returns the User object.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - Missing Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = auth_service.get_user(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return User(**user_data)
