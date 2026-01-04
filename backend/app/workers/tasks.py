import logging
import asyncio
from app.api.v1.endpoints.campaigns import run_campaign_execution

logger = logging.getLogger("worker.tasks")

async def execute_campaign_task(ctx, campaign_id: str):
    """
    ARQ Task to execute a campaign.
    Retries automatically on failure (handled by settings).
    """
    try:
        logger.info(f"STARTING CAMPAIGN TASK: {campaign_id}")
        await run_campaign_execution(campaign_id)
        logger.info(f"FINISHED CAMPAIGN TASK: {campaign_id}")
    except Exception as e:
        logger.error(f"CAMPAIGN TASK FAILED: {e}")
        raise e
