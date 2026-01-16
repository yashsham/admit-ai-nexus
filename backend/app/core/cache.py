from typing import Any, Optional
import json
import asyncio
from functools import wraps
from app.core.config import settings
import redis.asyncio as redis
import time

# Re-use connection str
REDIS_URL = settings.REDIS_URL or "redis://localhost:6379"

class LRUCache:
    """
    Simple in-memory LRU Cache for O(1) access when Redis is unavailable.
    """
    def __init__(self, capacity: int = 100):
        self.capacity = capacity
        self.cache = {}
        self.order = [] # Keep track of usage order (end is most recent)

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            # Move to end (mark as recently used)
            self.order.remove(key)
            self.order.append(key)
            val, expiry = self.cache[key]
            if expiry and time.time() > expiry:
                self.delete(key)
                return None
            return val
        return None

    def set(self, key: str, value: Any, ttl: int = 300):
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            # Evict LRU (first item)
            oldest = self.order.pop(0)
            del self.cache[oldest]
        
        self.order.append(key)
        self.cache[key] = (value, time.time() + ttl)

    def delete(self, key: str):
        if key in self.cache:
            del self.cache[key]
            if key in self.order:
                self.order.remove(key)

class CacheService:
    def __init__(self):
        self.use_redis = False
        try:
            if REDIS_URL and "redis" in REDIS_URL:
                 self.redis = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
                 self.use_redis = True
        except Exception:
            print("Redis unavailable, using in-memory cache")
        
        self.memory_cache = LRUCache(capacity=500)

    async def get(self, key: str) -> Optional[Any]:
        # 1. Check Memory (L1)
        mem_res = self.memory_cache.get(key)
        if mem_res: return mem_res
        
        # 2. Check Redis (L2)
        if self.use_redis:
            try:
                data = await self.redis.get(key)
                if data:
                    val = json.loads(data)
                    # Populate L1 for next time
                    self.memory_cache.set(key, val, ttl=60) 
                    return val
            except Exception: pass
        return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        # Write to both
        self.memory_cache.set(key, value, ttl)
        if self.use_redis:
            try:
                await self.redis.set(key, json.dumps(value), ex=ttl)
            except Exception: pass

    async def delete(self, key: str):
        self.memory_cache.delete(key)
        if self.use_redis:
            try:
                await self.redis.delete(key)
            except Exception: pass

    async def invalidate(self, pattern: str):
        # Hard to do pattern match on dict efficiently without O(N) scan
        # For memory cache, we'll just clear simplistic matches or everything dependent on implementation
        # For now, just clear Redis
        if self.use_redis:
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
            try:
                # Generate cache key based on kwargs
                user = kwargs.get('current_user')
                user_key = user.id if user else "anon"
                
                # Combine distinct kwargs to form unique key
                # This is heuristic; for perfect keys pick specific args
                param_key = ""
                if 'campaign_id' in kwargs: param_key += str(kwargs['campaign_id'])
                if 'time_range' in kwargs: param_key += str(kwargs['time_range'])
                
                cache_key = f"{key_prefix}:{func.__name__}:{user_key}:{param_key}"
                
                cached = await cache.get(cache_key)
                if cached:
                    return cached
            except Exception as e: 
                print(f"Cache read error: {e}")
            
            result = await func(*args, **kwargs)
            
            try:
                await cache.set(cache_key, result, ttl=ttl)
            except Exception as e:
                print(f"Cache write error: {e}")
            
            return result
        return wrapper
    return decorator
