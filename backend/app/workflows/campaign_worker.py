import asyncio
import json
import logging
from app.workflows.event_queue import event_queue
from app.api.v1.campaigns import run_campaign_execution

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CampaignWorker")

async def process_campaign_event(data: dict):
    """
    Handles campaign execution events from the queue.
    """
    event_type = data.get("type")
    campaign_id = data.get("campaign_id")
    
    logger.info(f"Received Event: {event_type} for Campaign {campaign_id}")
    
    if event_type == "execute_campaign" and campaign_id:
        try:
            logger.info("Starting Campaign Execution via Worker...")
            await run_campaign_execution(campaign_id)
            logger.info("Campaign Execution Completed.")
        except Exception as e:
            logger.error(f"Worker Execution Failed: {e}")
    else:
        logger.warning(f"Unknown or Invalid Event: {data}")

async def start_worker():
    """
    Starts the worker subscription.
    """
    logger.info("--- Starting Campaign AI Worker ---")
    await event_queue.subscribe("campaign_events", process_campaign_event)

if __name__ == "__main__":
    asyncio.run(start_worker())
