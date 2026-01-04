from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
import logging

logger = logging.getLogger("api.task_queue")

class TaskQueue:
    _pool = None

    @classmethod
    async def get_pool(cls):
        if cls._pool is None:
            cls._pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL or "redis://localhost:6379"))
        return cls._pool

    @classmethod
    async def enqueue(cls, task_name: str, *args, **kwargs):
        try:
            pool = await cls.get_pool()
            await pool.enqueue_job(task_name, *args, **kwargs)
            logger.info(f"Enqueued Task: {task_name} {args}")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue task {task_name}: {e}")
            return False

    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

task_queue = TaskQueue
