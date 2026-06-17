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
            try:
                # Configure Redis with low retries for fast fallback
                # Note: conn_retries is part of RedisSettings
                redis_settings = RedisSettings.from_dsn(
                    settings.REDIS_URL or "redis://localhost:6379",
                    conn_retries=0,
                    conn_timeout=1
                )
                # create_pool in some versions of arq might not accept default_job_timeout directly if settings is passed?
                # or the error was misleading. We will rely on settings. 
                cls._pool = await create_pool(redis_settings)
            except Exception as e:
                logger.warning(f"Redis Connection Failed: {e}. Workers will run locally.")
                return None
        return cls._pool

    @classmethod
    async def enqueue(cls, task_name: str, *args, **kwargs):
        try:
            pool = await cls.get_pool()
            if pool:
                await pool.enqueue_job(task_name, *args, **kwargs)
                logger.info(f"Enqueued Task to Redis: {task_name}")
                return True
        except Exception as e:
            logger.warning(f"Redis Enqueue Failed ({e}). Falling back to Local Execution.")
        
        # Fallback: Execute instantly using asyncio (Background-ish)
        try:
            # Registry of known tasks (Simplistic fallback registry)
            from app.workflows.tasks import execute_campaign_task
            
            task_map = {
                "execute_campaign_task": execute_campaign_task
            }
            
            func = task_map.get(task_name)
            if func:
                import asyncio
                # We assume args[0] is always ctx which we mock as None for local fallback, 
                # but arq passes ctx as first arg. 
                # Our enqueue wrappers usually pass arguments *after* task name.
                # If we passed `enqueue("task", arg1)`, arq calls `task(ctx, arg1)`.
                # So we must manually pass a dummy ctx AND the args.
                
                class MockContext:
                    pass
                
                # Run purely in background without awaiting (Fire and Forget)
                asyncio.create_task(func(MockContext(), *args, **kwargs))
                logger.info(f"Fallback: Started Async Local Task: {task_name}")
                return True
            else:
                 logger.error(f"Fallback Error: Unknown task '{task_name}'")
                 return False
                 
        except Exception as ex:
            logger.error(f"Fallback Execution Failed: {ex}")
            return False

    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

task_queue = TaskQueue
