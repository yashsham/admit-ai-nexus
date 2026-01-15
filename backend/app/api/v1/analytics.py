from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, List, Any
from app.data.supabase_client import supabase
from app.security.dependencies import get_current_user, User
from app.core.cache import cache_response
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter()

# --- DSA Helper: In-Memory Aggregation O(N) ---
def aggregate_time_series(executions: List[Dict], days: int = 7) -> List[Dict]:
    """
    Aggregates execution data into a time series for the last `days`.
    Time Complexity: O(N) where N is number of executions.
    Space Complexity: O(D) where D is number of days (buckets).
    """
    now = datetime.utcnow()
    # Initialize buckets for O(1) lookups during filling, O(D) space
    buckets = { (now - timedelta(days=i)).date(): {"date": (now - timedelta(days=i)).strftime("%Y-%m-%d"), "email": 0, "voice": 0, "whatsapp": 0} for i in range(days) }
    
    for ex in executions:
        try:
            ts_str = ex.get("executed_at")
            if not ts_str: continue
            
            # FAST & SAFE: Extract YYYY-MM-DD directly from ISO string "2023-01-01T..."
            # This avoids datetime parsing overhead/errors for simple bucketing.
            date_str = str(ts_str)[:10]
            
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d").date()
                if dt in buckets:
                    channel = ex.get("channel")
                    if channel in buckets[dt]: # Only count known channels
                        buckets[dt][channel] += 1
            except ValueError:
                continue # Skip invalid date formats
        except Exception:
            continue
            
    # Convert dict values to list, sorted by date. O(D log D) - D is small (7, 30)
    return sorted(list(buckets.values()), key=lambda x: x["date"])

def aggregate_channel_metrics(executions: List[Dict]) -> List[Dict]:
    """
    Aggregates simple channel stats. O(N).
    """
    stats = defaultdict(lambda: {"sent": 0, "delivered": 0, "failed": 0, "opened": 0})
    
    for ex in executions:
        ch = ex.get("channel", "unknown")
        status = ex.get("status", "unknown")
        
        stats[ch]["sent"] += 1
        if status == "delivered" or status == "completed":
            stats[ch]["delivered"] += 1
        elif status == "failed":
            stats[ch]["failed"] += 1
        
        # 'opened' logic would depend on specific events, assuming 'responded' or specific tag for now, 
        # or simplified as delivered for this MVP unless 'opened' status exists.
        # Let's check for a fictitious 'opened' status or just assume engagement = response for now.
        if status == "opened" or status == "responded":
             stats[ch]["opened"] += 1

    return [
        {"channel": k, "sent": v["sent"], "delivered": v["delivered"], "failed": v["failed"], "opened": v["opened"], "engagement_rate": (v["delivered"]/v["sent"]*100) if v["sent"] > 0 else 0}
        for k, v in stats.items()
    ]

# ----------------------------------------------

@router.get("/engagement")
@cache_response(ttl=60, key_prefix="analytics_engagement")
async def get_candidate_engagement(current_user: User = Depends(get_current_user)):
    """
    Returns candidate engagement metrics (Interested vs Others)
    """
    try:
        # User Isolation: Filter by user_id
        # Parallelize independent queries
        f1 = asyncio.to_thread(lambda: supabase.table("candidates").select("*", count="exact", head=True).eq("status", "interested").eq("user_id", current_user.id).execute())
        f2 = asyncio.to_thread(lambda: supabase.table("candidates").select("*", count="exact", head=True).neq("status", "pending").eq("user_id", current_user.id).execute())
        f3 = asyncio.to_thread(lambda: supabase.table("candidates").select("*", count="exact", head=True).eq("user_id", current_user.id).execute())

        res_interested, res_responded, res_total = await asyncio.gather(f1, f2, f3)
        
        total_count = res_total.count if res_total.count is not None else 0
        
        return {
            "total_candidates": total_count,
            "responded": res_responded.count if res_responded.count is not None else 0,
            "interested": res_interested.count if res_interested.count is not None else 0,
            "conversion_rate": (res_interested.count / total_count * 100) if total_count > 0 else 0
        }
    except Exception as e:
        print(f"Error in engagement: {e}")
        return {"error": str(e)}

@router.get("/agent/dashboard")
@cache_response(ttl=60, key_prefix="analytics_agent")
async def get_agent_analytics(time_range: str = "7d", current_user: User = Depends(get_current_user)):
    """
    New Endpoint for Agent Analytics Dashboard.
    Performs heavy aggregation on Backend (O(N)) to return ready-to-render charts.
    """
    try:
        # Determine date range
        days = 7
        if time_range == "24h": days = 1
        elif time_range == "30d": days = 30
        
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # 1. Fetch ALL relevant executions for this user in the time range.
        #    We assume the user doesn't have millions of rows per week yet. 
        #    If they do, we'd need database-side aggregation (RPC).
        #    For now, select specific columns to minimize bandwidth.
        
        # First get users campaigns to secure the query
        res_campaigns = supabase.table("campaigns").select("id").eq("user_id", current_user.id).execute()
        user_campaign_ids = [c['id'] for c in res_campaigns.data] if res_campaigns.data else []
        
        if not user_campaign_ids:
            return {"time_series": [], "channel_metrics": [], "summary": {}}

        # Fetch raw data
        response = await asyncio.to_thread(lambda: supabase.table("campaign_executions")
            .select("channel, status, executed_at, campaign_id")
            .in_("campaign_id", user_campaign_ids)
            .gte("executed_at", start_date)
            .execute())
            
        data = response.data if response.data else []
        
        # 2. In-Memory Aggregation (DSA: Hashing & Bucketing)
        time_series = aggregate_time_series(data, days)
        channel_metrics = aggregate_channel_metrics(data)
        
        # 3. Summary Stats
        total_sent = len(data)
        total_engaged = sum(1 for x in data if x.get("status") in ["delivered", "completed", "responded"])
        
        return {
            "time_series": time_series,
            "channel_metrics": channel_metrics,
            "summary": {
                "total_sent": total_sent,
                "total_engaged": total_engaged,
                "engagement_rate": (total_engaged / total_sent * 100) if total_sent > 0 else 0,
                "active_channels": len([c for c in channel_metrics if c['sent'] > 0])
            }
        }

    except Exception as e:
        print(f"Error in agent analytics: {e}")
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
                "overview": {"total_sent": 0, "delivery_rate": 0, "active_campaigns": 0, "interested_candidates": 0, "calls_made": 0, "responses_received": 0},
                "channel_stats": {}, "recent_failures": [], "recent_activity": []
            }
            
        # If specific campaign requested, ensure ownership
        target_cids = user_campaign_ids
        if campaign_id and campaign_id != "all":
            if campaign_id not in user_campaign_ids:
                raise HTTPException(status_code=403, detail="Access denied to this campaign")
            target_cids = [campaign_id]
        
        # 2. Optimized Queries with User Scope
        
        # Helper for scoped count using database-side aggregation (O(1))
        def get_count_sync(table, extra_filters=None):
            q = supabase.table(table).select("id", count="exact", head=True)
            
            if table == "campaign_executions":
                q = q.in_("campaign_id", target_cids)
            elif table == "candidates":
                q = q.eq("user_id", current_user.id)
            
            if extra_filters:
                for k, v in extra_filters.items():
                    q = q.eq(k, v)
                    
            return q.execute()

        # Concurrent Execution for maximum speed
        # We define all our "futures" here
        
        # 1. Total Sent (Executions)
        f_total = asyncio.to_thread(lambda: get_count_sync("campaign_executions"))
        
        # 2. Total Delivered
        f_delivered = asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"status": "delivered"}))
        
        # 3. Interested Candidates
        f_interested = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).eq("status", "interested").execute())

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
        
        # 6. Calls Made
        f_calls = asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "voice"})) # Count all voice attempts
        
        # 7. Responses Received
        f_responses = asyncio.to_thread(lambda: supabase.table("candidates").select("id", count="exact", head=True).eq("user_id", current_user.id).eq("status", "responded").execute())


        # Run the heavy hitters
        results = await asyncio.gather(
            f_total, f_delivered, f_interested, f_failures, f_recent,
            f_calls, f_responses,
            # Add channels inline for detailed breakdown
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "email", "status": "delivered"})),
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "email", "status": "failed"})),
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "whatsapp", "status": "delivered"})),
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "whatsapp", "status": "failed"})),
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "voice", "status": "delivered"})),
            asyncio.to_thread(lambda: get_count_sync("campaign_executions", {"channel": "voice", "status": "failed"})),
            return_exceptions=True
        )
        
        # Unpack securely
        def get_cnt(res):
            if isinstance(res, Exception): return 0
            return res.count if hasattr(res, 'count') and res.count is not None else 0
            
        total_msg = get_cnt(results[0])
        delivered = get_cnt(results[1])
        interested_count = get_cnt(results[2])
        
        failures_data = results[3].data if hasattr(results[3], 'data') else []
        recent_data = results[4].data if hasattr(results[4], 'data') else []
        
        calls_made = get_cnt(results[5])
        responses_received = get_cnt(results[6])

        # Channel mapping
        channel_stats = {
            "email": {"sent": get_cnt(results[7]) + get_cnt(results[8]), "failed": get_cnt(results[8])},
            "whatsapp": {"sent": get_cnt(results[9]) + get_cnt(results[10]), "failed": get_cnt(results[10])},
            "voice": {"sent": get_cnt(results[11]) + get_cnt(results[12]), "failed": get_cnt(results[12])}
        }
        
        # Ensure 'sent' values in overview match reality of messages actually sent
        # (Usually Total Sent = Email Sent + WA Sent + Voice Sent, roughly)
        
        return {
            "overview": {
                "total_sent": total_msg,
                "delivery_rate": (delivered / total_msg * 100) if total_msg > 0 else 0,
                "active_campaigns": len(user_campaign_ids),
                "interested_candidates": interested_count,
                "calls_made": calls_made,
                "responses_received": responses_received
            },
            "channel_stats": channel_stats,
            "recent_failures": failures_data,
            "recent_activity": recent_data
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"error": str(e)}
