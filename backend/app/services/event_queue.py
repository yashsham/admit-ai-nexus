from typing import Any, Dict, Protocol
import asyncio
import json

class EventProvider(Protocol):
    async def publish(self, topic: str, message: Dict[str, Any]) -> bool:
        ...
    async def subscribe(self, topic: str, handler: Any) -> None:
        ...

class InMemoryQueue:
    """Simple in-memory queue for dev/fallback"""
    def __init__(self):
        self.listeners = {}

    async def publish(self, topic: str, message: Dict[str, Any]) -> bool:
        print(f"[Queue] Publishing to {topic}: {message}")
        if topic in self.listeners:
            for handler in self.listeners[topic]:
                asyncio.create_task(handler(message))
        return True

    async def subscribe(self, topic: str, handler: Any) -> None:
        if topic not in self.listeners:
            self.listeners[topic] = []
        self.listeners[topic].append(handler)
        print(f"[Queue] Subscribed to {topic}")

# Global Event Queue Instance
import redis.asyncio as redis
from app.core.config import settings

class RedisQueue:
    def __init__(self, url: str):
        self.redis = redis.from_url(url, encoding="utf-8", decode_responses=True)
        self.pubsub = self.redis.pubsub()

    async def publish(self, topic: str, message: Dict[str, Any]) -> bool:
        await self.redis.publish(topic, json.dumps(message))
        return True

    async def subscribe(self, topic: str, handler: Any) -> None:
        await self.pubsub.subscribe(topic)
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await handler(data)

event_queue = RedisQueue(settings.REDIS_URL) if "redis" in settings.REDIS_URL else InMemoryQueue()
