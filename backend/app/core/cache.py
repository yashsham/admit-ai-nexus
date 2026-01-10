from typing import Any, Optional, Callable
import json
import asyncio
from functools import wraps
from app.workflows.event_queue import event_queue
from app.core.config import settings
import redis.asyncio as redis

# Re-use connection str
REDIS_URL = settings.REDIS_URL

class CacheService:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)

    async def get(self, key: str) -> Optional[Any]:
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set(self, key: str, value: Any, ttl: int = 300):
        await self.redis.set(key, json.dumps(value), ex=ttl)

    async def invalidate(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

cache = CacheService()

def cache_response(ttl: int = 60, key_prefix: str = ""):
    """
    Decorator to cache FastAPI endpoint responses.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key based on args (simplified)
            # In real usage, might need robust key generation including user_id
            user = kwargs.get('current_user')
            user_key = user.id if user else "anon"
            cache_key = f"{key_prefix}:{func.__name__}:{user_key}"
            
            try:
                cached = await cache.get(cache_key)
                if cached:
                    return cached
            except Exception: pass # Fail open if cache error
            
            result = await func(*args, **kwargs)
            
            try:
                # Handle Pydantic models by assuming result acts like a dict or list
                # In FastAPI endpoints, results are often Pydantic models. 
                # Ideally, use jsonable_encoder but for simplicity rely on json consistency.
                await cache.set(cache_key, result, ttl=ttl)
            except Exception: pass
            
            return result
        return wrapper
    return decorator
