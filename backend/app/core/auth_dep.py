
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.services.supabase_client import supabase
from pydantic import BaseModel

# Defines the token source (Bearer header)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class User(BaseModel):
    id: str
    email: str

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validates the Supabase JWT and returns the User object.
    """
    if not token:
        # For development/testing flexibility or if frontend fails to send token
        # we might want to fail hard or soft. 
        # Given "Data Leak" is the issue, we MUST fail hard if no token.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Verify with Supabase Auth
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = user_response.user
        return User(id=user.id, email=user.email)
        
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
