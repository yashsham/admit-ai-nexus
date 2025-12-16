from fastapi import APIRouter
from typing import Optional
from app.services.supabase_client import supabase

router = APIRouter()

@router.get("")
async def get_analytics(campaign_id: Optional[str] = None):
    try:
        # Simplify query builder
        def get_base_query():
            q = supabase.table("campaign_executions").select("*", count="exact")
            if campaign_id:
                q = q.eq("campaign_id", campaign_id)
            return q

        # 1. Total Messages
        res_total = get_base_query().limit(0).execute()
        total_msg = res_total.count or 0

        # 2. Delivered Total
        res_delivered = get_base_query().eq("status", "delivered").limit(0).execute()
        delivered = res_delivered.count or 0

        # 3. Channel Stats (Sent vs Failed)
        channels = ["email", "whatsapp", "voice"]
        channel_stats = {}
        
        for ch in channels:
            # Delivered
            r_del = get_base_query().eq("channel", ch).eq("status", "delivered").limit(0).execute()
            # Failed
            r_fail = get_base_query().eq("channel", ch).eq("status", "failed").limit(0).execute()
            
            channel_stats[ch] = {
                "sent": r_del.count or 0,
                "failed": r_fail.count or 0
            }

        # 4. Recent Failures (The "Backend" info user asked for)
        query_failures = supabase.table("campaign_executions")\
            .select("id, recipient, channel, status, executed_at, message_content")\
            .eq("status", "failed")\
            .order("executed_at", desc=True)\
            .limit(10)
            
        if campaign_id:
            query_failures = query_failures.eq("campaign_id", campaign_id)
            
        failures_data = query_failures.execute().data

        # 5. Recent Activity
        query_recent = supabase.table("campaign_executions").select("id, status, channel, executed_at").order("executed_at", desc=True).limit(5)
        if campaign_id:
            query_recent = query_recent.eq("campaign_id", campaign_id)
        data_recent = query_recent.execute().data
        
        return {
            "overview": {
                "total_sent": total_msg,
                "delivery_rate": (delivered / total_msg * 100) if total_msg > 0 else 0,
                "active_campaigns": 3 
            },
            "channel_stats": channel_stats,
            "recent_failures": failures_data,
            "recent_activity": data_recent
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"error": str(e)}
