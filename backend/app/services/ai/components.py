from typing import List, Dict, Any
import logging
from app.core.config import settings

# Placeholder for real cost tracking (e.g. database table)
USAGE_LOG = []

class ModelRouter:
    """
    Routes AI requests to the best available model based on complexity and cost.
    Fallback logic is handled by the model lists.
    """
    @staticmethod
    def get_best_model_for_task(task_type: str) -> str:
        # Example routing logic
        if task_type == "coding":
            return "claude-3-opus" if settings.OPENROUTER_API_KEY else "llama-3"
        elif task_type == "chat":
            return "llama-3-70b" 
        return "gemini-pro"

class CostTracker:
    @staticmethod
    def track_request(model: str, input_tokens: int, output_tokens: int):
        cost = CostTracker.calculate_cost(model, input_tokens, output_tokens)
        USAGE_LOG.append({
            "model": model,
            "input": input_tokens,
            "output": output_tokens,
            "estimated_cost": cost
        })
        logging.info(f"[CostTracker] {model}: ${cost:.6f}")

    @staticmethod
    def calculate_cost(model: str, input_t: int, output_t: int) -> float:
        # Define rates per 1k tokens
        rates = {
            "gpt-4": (0.03, 0.06),
            "llama-3-70b": (0.0007, 0.0009), # Groq is cheap/free currently
            "gemini-pro": (0.00025, 0.0005)
        }
        in_rate, out_rate = rates.get(model, (0.0, 0.0))
        return (input_t / 1000 * in_rate) + (output_t / 1000 * out_rate)

class PromptValidator:
    @staticmethod
    def validate(prompt: str) -> bool:
        """
        Checks for basic safety/policy violations.
        """
        forbidden = ["ignore previous instructions", "system prompt", "pwned"]
        if any(f in prompt.lower() for f in forbidden):
            return False
        return True
