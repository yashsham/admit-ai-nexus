import datetime
from typing import Optional
from app.core.config import settings

class SubscriptionService:
    """
    Manages User Subscriptions and Usage Limits.
    """
    
    # Plan Limits Configuration
    PLANS = {
        "starter": {
            "voice_calls": 50,
            "whatsapp_msgs": 100,
            "email_sent": 100,
            "campaigns": 5, # Active templates? Or total? Let's say Total Active campaigns.
            "analytics_advanced": False
        },
        "professional": {
            "voice_calls": 500,
            "whatsapp_msgs": 1000,
            "email_sent": 1000,
            "campaigns": 50, # Unlimited
            "analytics_advanced": True
        },
        "enterprise": {
            "voice_calls": 10000,
            "whatsapp_msgs": 20000,
            "email_sent": 20000, # Unlimited
            "campaigns": 500,
            "analytics_advanced": True
        }
    }

    @staticmethod
    def get_current_period_key() -> str:
        """Returns 'YYYY-MM' for current month."""
        return datetime.datetime.now().strftime("%Y-%m")

    @staticmethod
    def get_user_plan(user_id: str) -> str:
        """
        Fetches user plan from Supabase. Defaults to 'starter'.
        """
        try:
            from app.services.supabase_client import supabase
            res = supabase.table("subscriptions").select("plan_id, status").eq("user_id", user_id).execute()
            if res.data and len(res.data) > 0:
                # check status?
                sub = res.data[0]
                if sub.get("status") == "active":
                    return sub.get("plan_id", "starter")
            return "starter"
        except Exception as e:
            print(f"[Subscription] Error fetching plan: {e}")
            return "starter"

    @staticmethod
    def check_usage(user_id: str, feature: str) -> bool:
        """
        Checks if user has quota for a specific feature.
        Features: 'voice_calls', 'whatsapp_msgs', 'campaigns'
        """
        plan_id = SubscriptionService.get_user_plan(user_id)
        limits = SubscriptionService.PLANS.get(plan_id, SubscriptionService.PLANS["starter"])
        
        limit = limits.get(feature, 0)
        if limit == 9999: return True # Unlimited
        
        # Check current usage
        try:
            from app.services.supabase_client import supabase
            period = SubscriptionService.get_current_period_key()
            
            # Using RPC or manual sum? Manual sum for now (simpler logic, less SQL).
            # usage_logs stores incremental rows? Or we store 'count' per row? 
            # Proposed Schema: one row per event? NO, that's too big. 
            # Better: One row per (user, feature, period) and increment 'count'.
            
            res = supabase.table("usage_logs").select("count").eq("user_id", user_id).eq("feature_name", feature).eq("period_key", period).execute()
            
            current_usage = sum([row['count'] for row in res.data]) if res.data else 0
            
            if current_usage >= limit:
                print(f"[Limit Reached] User {user_id} hit limit for {feature} ({current_usage}/{limit})")
                return False
                
            return True
            
        except Exception as e:
            print(f"[Subscription] Error checking usage: {e}")
            # Fail safe: Allow if DB error? Or block? 
            # Let's allow to avoid downtime disruption, but log error.
            return True

    @staticmethod
    def log_usage(user_id: str, feature: str, amount: int = 1):
        """
        Increments usage counter.
        """
        try:
            from app.services.supabase_client import supabase
            period = SubscriptionService.get_current_period_key()
            
            # Upsert Logic is tricky without a unique constraint on (user, feature, period).
            # We will just INSERT a new log entry with count=amount for simplicity and sum them up.
            # This is write-heavy but safe from concurrency overwrite issues without atomic functions.
            
            data = {
                "user_id": user_id,
                "feature_name": feature,
                "count": amount,
                "period_key": period
            }
            supabase.table("usage_logs").insert(data).execute()
            
        except Exception as e:
            print(f"[Subscription] Error logging usage: {e}")

subscription_service = SubscriptionService()
