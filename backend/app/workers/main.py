import logging
from app.core.config import settings
from app.workers.tasks import execute_campaign_task
from app.core.logger_config import setup_logging
from arq.connections import RedisSettings

setup_logging()
logger = logging.getLogger("worker.main")

async def startup(ctx):
    logger.info("--- WORKER STARTUP ---")
    # Initialize implementation-specific needs here (DB, etc - though usually handled by deps)

async def shutdown(ctx):
    logger.info("--- WORKER SHUTDOWN ---")

class WorkerSettings:
    functions = [execute_campaign_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL or "redis://localhost:6379")
    max_jobs = 10
    on_startup = startup
    on_shutdown = shutdown
    handle_signals = False # Let uvicorn/supervisor handle signals if needed, or True for standalone script
