from typing import Optional
from app.services.supabase_client import supabase
from app.core.config import settings

class AuthService:
    """
    Service responsible for Authentication & Authorization.
    Abstracts the underlying provider (Supabase) to allow future swaps if needed.
    """
    @staticmethod
    def get_user(token: str) -> Optional[dict]:
        try:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                user = user_response.user
                return {
                    "id": user.id,
                    "email": user.email,
                    # Map other fields as needed
                }
        except Exception as e:
            print(f"[AuthService] Validation Failed: {e}")
        return None

    @staticmethod
    def sign_out(token: str):
        # Implement token revocation if supported
        pass

auth_service = AuthService()
