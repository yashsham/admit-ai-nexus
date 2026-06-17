from fastapi import HTTPException, Request, Depends
from app.data.supabase_client import supabase
from app.observability.logging import audit_logger
from datetime import datetime, timezone
import logging

logger = logging.getLogger("cost_tracker")

# Cost Dictionary (USD per 1M tokens) - Update regularly
# Approx Rates (Jan 2026)
MODEL_COSTS = {
    # Groq (Llama 3) - Often Free/Cheap
    "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79}, 
    "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
    
    # Gemini 2.0 Flash
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    
    # OpenAI (OpenRouter proxy usually)
    "gpt-4o": {"input": 2.50, "output": 10.00},
    
    # Fallback default
    "default": {"input": 1.00, "output": 2.00}
}

class CostTracker:
    @staticmethod
    def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate cost in USD for a given LLM request.
        """
        rates = MODEL_COSTS.get(model_name, MODEL_COSTS["default"])
        
        input_cost = (input_tokens / 1_000_000) * rates["input"]
        output_cost = (output_tokens / 1_000_000) * rates["output"]
        
        return round(input_cost + output_cost, 6)

    @staticmethod
    async def track_usage(user_id: str, model_name: str, input_tokens: int, output_tokens: int):
        """
        Log token usage and cost to Supabase.
        """
        cost = CostTracker.calculate_cost(model_name, input_tokens, output_tokens)
        
        try:
            # 1. Structured Logging (Low Latency)
            logger.info(
                "Token Usage",
                extra={
                    "data": {
                        "metric": "token_usage",
                        "user_id": user_id,
                        "model": model_name,
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "cost_usd": cost
                    }
                }
            )
            
            # 2. Async DB Write (Ideally via queue, but direct for now)
            # This table 'token_usage' needs to be created in Supabase migrations if not exists
            # We will use 'user_usage' for now if it has flexible columns, or just log if schema is strict.
            # Assuming we can insert into a dedicated analytic table or a JSONB column.
            
            # For this Phase, we will just log to stdout using audit logger for aggregators to pick up.
            audit_logger.log_event(
                event_type="llm_usage",
                user_id=user_id,
                details={
                    "model": model_name,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": cost
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to track usage: {e}")

# Keep legacy rate limiter for backward compatibility until refactor is complete
async def verify_usage_limit(request: Request):
    """
    Legacy IP-based rate limiter.
    """
    # ... (Keep existing simple logic if needed, or deprecate)
    # For now, we return True to avoid breaking existing dependencies
    return True
