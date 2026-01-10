from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.data.supabase_client import supabase
from app.security.dependencies import get_current_user, User
import asyncio

router = APIRouter()

from app.core.cache import cache_response

@router.get("/engagement")
@cache_response(ttl=300, key_prefix="analytics_engagement")
async def get_candidate_engagement(current_user: User = Depends(get_current_user)):
    """
    Returns candidate engagement metrics (Interested vs Others)
    """
    try:
        from app.data.supabase_client import supabase
        
        # User Isolation: Filter by user_id
        res_interested = supabase.table("candidates").select("*", count="exact", head=True).eq("status", "interested").eq("user_id", current_user.id).execute()
        res_responded = supabase.table("candidates").select("*", count="exact", head=True).neq("status", "pending").eq("user_id", current_user.id).execute()
        res_total = supabase.table("candidates").select("*", count="exact", head=True).eq("user_id", current_user.id).execute()
        
        return {
            "total_candidates": res_total.count,
            "responded": res_responded.count,
            "interested": res_interested.count,
            "conversion_rate": (res_interested.count / res_total.count * 100) if res_total.count > 0 else 0
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("")
@cache_response(ttl=60, key_prefix="analytics_main")
async def get_analytics(campaign_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    try:
        # 1. Scope Validation: Fetch User's Campaigns
        res_campaigns = supabase.table("campaigns").select("id").eq("user_id", current_user.id).execute()
        user_campaign_ids = [c['id'] for c in res_campaigns.data] if res_campaigns.data else []
        
        # If user has no campaigns, return empty stats immediately
        if not user_campaign_ids:
            return {
                "overview": {"total_sent": 0, "delivery_rate": 0, "active_campaigns": 0, "interested_candidates": 0},
                "channel_stats": {}, "recent_failures": [], "recent_activity": []
            }
            
        # If specific campaign requested, ensure ownership
        target_cids = user_campaign_ids
        if campaign_id:
            if campaign_id not in user_campaign_ids:
                raise HTTPException(status_code=403, detail="Access denied to this campaign")
            target_cids = [campaign_id]

        # 2. Optimized Queries with User Scope
        
        # Helper for scoped count using database-side aggregation (O(1))
        async def get_count(table, extra_filters=None):
            q = supabase.table(table).select("id", count="exact", head=True)
            
            if table == "campaign_executions":
                q = q.in_("campaign_id", target_cids)
            elif table == "candidates":
                q = q.eq("user_id", current_user.id)
            
            if extra_filters:
                for k, v in extra_filters.items():
                    q = q.eq(k, v)
                    
            return q.execute()

        import asyncio
        
        # Concurrent Execution for maximum speed
        # We define all our "futures" here
        
        # 1. Total Sent (Executions)
        f_total = asyncio.to_thread(lambda: get_count("campaign_executions"))
        
        # 2. Total Delivered
        f_delivered = asyncio.to_thread(lambda: get_count("campaign_executions", {"status": "delivered"}))
        
        # 3. Interested Candidates
        f_interested = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).cs("tags", ["interested"]).execute())

        # 4. Recent Failures (Data fetch, limit 10)
        f_failures = asyncio.to_thread(lambda: supabase.table("campaign_executions")
                .select("id, recipient, channel, status, executed_at, message_content, campaigns(name)")
                .in_("campaign_id", target_cids)
                .eq("status", "failed")
                .order("executed_at", desc=True)
                .limit(10).execute())

        # 5. Recent Activity (Data fetch, limit 5)
        f_recent = asyncio.to_thread(lambda: supabase.table("campaign_executions")
                .select("id, status, channel, executed_at")
                .in_("campaign_id", target_cids)
                .order("executed_at", desc=True)
                .limit(5).execute())

        # Channels stats (Email/Whatsapp/Voice)
        # We'll just fetch them sequentially or map them, but let's gather key metrics first
        # Ideally we'd use a single GroupBy query if Supabase/Postgrest supported it easily via JS client, 
        # but parallel async calls are "good enough" for <10k rows.
        
        # Run the heavy hitters
        results = await asyncio.gather(
            f_total, f_delivered, f_interested, f_failures, f_recent,
            # Add channels inline
            asyncio.to_thread(lambda: get_count("campaign_executions", {"channel": "email", "status": "delivered"})),
            asyncio.to_thread(lambda: get_count("campaign_executions", {"channel": "email", "status": "failed"})),
            asyncio.to_thread(lambda: get_count("campaign_executions", {"channel": "whatsapp", "status": "delivered"})),
            asyncio.to_thread(lambda: get_count("campaign_executions", {"channel": "whatsapp", "status": "failed"})),
            return_exceptions=True
        )
        
        # Unpack securely
        def get_cnt(res):
            return res.count if hasattr(res, 'count') and res.count is not None else 0
            
        total_msg = get_cnt(results[0])
        delivered = get_cnt(results[1])
        interested_count = get_cnt(results[2])
        
        failures_data = results[3].data if hasattr(results[3], 'data') else []
        recent_data = results[4].data if hasattr(results[4], 'data') else []

        # Channel mapping
        channel_stats = {
            "email": {"sent": get_cnt(results[5]), "failed": get_cnt(results[6])},
            "whatsapp": {"sent": get_cnt(results[7]), "failed": get_cnt(results[8])},
            "voice": {"sent": 0, "failed": 0} # Placeholder
        }
        
        return {
            "overview": {
                "total_sent": total_msg,
                "delivery_rate": (delivered / total_msg * 100) if total_msg > 0 else 0,
                "active_campaigns": len(user_campaign_ids),
                "interested_candidates": interested_count
            },
            "channel_stats": channel_stats,
            "recent_failures": failures_data,
            "recent_activity": recent_data
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"error": str(e)}
