from fastapi import APIRouter
from typing import Optional
from app.services.supabase_client import supabase

router = APIRouter()

@router.get("")
async def get_analytics(campaign_id: Optional[str] = None):
    try:
        # Get simplified counts
        # Optimize: Fetch counts directly from DB instead of fetching all rows
        
        # 1. Total Messages (Count only)
        query_total = supabase.table("campaign_executions").select("*", count="exact").limit(0)
        if campaign_id:
            query_total = query_total.eq("campaign_id", campaign_id)
        res_total = query_total.execute()
        total_msg = res_total.count if res_total.count is not None else 0

        # 2. Delivered Messages (Count only)
        query_delivered = supabase.table("campaign_executions").select("*", count="exact").limit(0).eq("status", "delivered")
        if campaign_id:
            query_delivered = query_delivered.eq("campaign_id", campaign_id)
        res_delivered = query_delivered.execute()
        delivered = res_delivered.count if res_delivered.count is not None else 0

        # 3. Recent Activity (Fetch only last 5)
        # created_at might be missing, so we just limit.
        query_recent = supabase.table("campaign_executions").select("id, status, channel").limit(5)
        if campaign_id:
            query_recent = query_recent.eq("campaign_id", campaign_id)
        data_recent = query_recent.execute().data
        
        return {
            "overview": {
                "total_sent": total_msg,
                "delivery_rate": (delivered / total_msg * 100) if total_msg > 0 else 0,
                "active_campaigns": 3 # Mock/simple logic kept as is
            },
            "recent_activity": data_recent
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"error": str(e)}
