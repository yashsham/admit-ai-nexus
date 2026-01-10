import logging
import asyncio
# from app.api.v1.campaigns import run_campaign_execution

logger = logging.getLogger("worker.tasks")

async def execute_campaign_task(ctx, campaign_id: str):
    """
    ARQ Task to execute a campaign.
    Retries automatically on failure (handled by settings).
    """
    try:
        logger.info(f"STARTING CAMPAIGN TASK: {campaign_id}")
        # Note: In a real scenario, we'd fetch the goal from DB using campaign_id
        # For this refactor, we are focusing on the Agent Switch.
        # Ideally, run_campaign_execution(campaign_id) handles DB lookups.
        
        # We need to re-import the logic from campaigns.py OR move the logic here.
        # Given the "Senior" refactor, let's keep it simple: call the service logic.
        
        from app.api.v1.campaigns import run_campaign_execution
        await run_campaign_execution(campaign_id)
        
        logger.info(f"FINISHED CAMPAIGN TASK: {campaign_id}")
    except Exception as e:
        logger.error(f"CAMPAIGN TASK FAILED: {e}")
        raise e
