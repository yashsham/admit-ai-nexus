from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.services.supabase_client import supabase
from app.core.auth_dep import get_current_user, User
import asyncio

router = APIRouter()

@router.get("/engagement")
async def get_candidate_engagement(current_user: User = Depends(get_current_user)):
    """
    Returns candidate engagement metrics (Interested vs Others)
    """
    try:
        from app.services.supabase_client import supabase
        
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
        
        # Helper for scoped count
        # We filter by IN list of IDs.
        async def get_count(table, extra_filters=None):
            q = supabase.table(table).select("id", count="exact")
            
            # Apply Campaign Scope for executions
            if table == "campaign_executions":
                q = q.in_("campaign_id", target_cids)
            # Apply User Scope for candidates
            elif table == "candidates":
                q = q.eq("user_id", current_user.id)
            
            if extra_filters:
                for k, v in extra_filters.items():
                    q = q.eq(k, v)
                    
            # Use limit(1) to minimize payload
            q = q.limit(1)
            return q.execute()

        import asyncio
        
        # Overview
        # Active Campaigns (User Scope)
        t_active = asyncio.to_thread(lambda: len([c for c in res_campaigns.data]) if not campaign_id else 1) 
        # (This is just counting the list we already fetched, simple)

        t_total = get_count("campaign_executions")
        t_delivered = get_count("campaign_executions", {"status": "delivered"})
        
        # Interested (User Scoped Candidates)
        # Note: We filter candidates by user_id AND "interested" tag
        t_interested = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact").eq("user_id", current_user.id).cs("tags", ["interested"]).limit(1).execute())

        # Channels
        # We iterate channels and run scoped queries
        channels = ["email", "whatsapp", "voice"]
        t_channels = []
        for ch in channels:
            t_channels.append(get_count("campaign_executions", {"channel": ch, "status": "delivered"})) # Sent
            t_channels.append(get_count("campaign_executions", {"channel": ch, "status": "failed"}))    # Failed

        # Tables (Failures & Recents) - User Scoped
        def fetch_failures():
            return supabase.table("campaign_executions")\
                .select("id, recipient, channel, status, executed_at, message_content, campaigns(name)")\
                .in_("campaign_id", target_cids)\
                .eq("status", "failed")\
                .order("executed_at", desc=True)\
                .limit(10).execute()
        
        def fetch_recent():
             return supabase.table("campaign_executions")\
                .select("id, status, channel, executed_at")\
                .in_("campaign_id", target_cids)\
                .order("executed_at", desc=True)\
                .limit(5).execute()

        # Batch Execute
        tasks = [t_total, t_delivered, t_interested] + t_channels + [asyncio.to_thread(fetch_failures), asyncio.to_thread(fetch_recent)]
        
        results = await asyncio.gather(*tasks)
        
        # Unpack Results
        total_msg = results[0].count or 0
        delivered = results[1].count or 0
        interested_count = results[2].count or 0
        
        channel_stats = {}
        idx = 3
        for ch in channels:
            sent = results[idx].count or 0
            fail = results[idx+1].count or 0
            channel_stats[ch] = {"sent": sent, "failed": fail}
            idx += 2
            
        failures_data = results[9].data
        recent_data = results[10].data
        
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
