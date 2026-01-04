from typing import List, Dict, Any, Tuple
import logging
import re
from app.core.config import settings

logger = logging.getLogger("ai.components")

class ModelRouter:
    """
    Routes AI requests to the best available model based on complexity and cost.
    """
    @staticmethod
    def get_best_model_for_task(task_type: str) -> str:
        if task_type == "coding":
            return "msg-gpt-4o" if settings.OPENROUTER_API_KEY else "llama-3-70b"
        elif task_type == "chat":
            return "llama-3-70b" 
        return "gemini-pro"

class CostTracker:
    @staticmethod
    def track_request(model: str, input_tokens: int, output_tokens: int):
        try:
            cost = CostTracker.calculate_cost(model, input_tokens, output_tokens)
            log_data = {
                "event": "cost_tracking",
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost_usd": float(f"{cost:.6f}")
            }
            # Structured Log (Senior Pattern)
            logger.info(f"Usage: {log_data}")
        except Exception as e:
            logger.error(f"Cost Tracking Failed: {e}")

    @staticmethod
    def calculate_cost(model: str, input_t: int, output_t: int) -> float:
        # Define rates per 1k tokens (Approximations)
        rates = {
            "gpt-4": (0.03, 0.06),
            "gpt-4o": (0.005, 0.015),
            "llama-3-70b": (0.0007, 0.0009), 
            "gemini-pro": (0.00025, 0.0005),
            "gemini-1.5-flash": (0.0001, 0.0001)
        }
        # Fuzzy match model name
        found_rate = (0.0, 0.0)
        for key, rate in rates.items():
            if key in model.lower():
                found_rate = rate
                break
        
        return (input_t / 1000 * found_rate[0]) + (output_t / 1000 * found_rate[1])

class PromptValidator:
    INJECTION_PATTERNS = [
        r"ignore previous instructions",
        r"system prompt",
        r"you are now",
        r"format your response as json", # If trying to break format
    ]
    
    PII_PATTERNS = {
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b"
    }

    @classmethod
    def validate(cls, prompt: str) -> Tuple[bool, str]:
        """
        Checks for Prompt Injection attempts.
        Returns (is_safe, reason).
        """
        if not prompt: 
            return False, "Empty Prompt"
            
        lower_prompt = prompt.lower()
        if len(prompt) > 8000:
             # Generous limit for RAG, but prevents buffer overflow attacks
            return False, "Prompt too long (Max 8000 chars)"
            
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, lower_prompt):
                return False, f"Potential Injection Detected: {pattern}"
                
        return True, "Safe"

    @classmethod
    def redact_pii(cls, text: str) -> str:
        """
        Redacts PII from text for logging/storage.
        """
        redacted = text
        for pii_type, pattern in cls.PII_PATTERNS.items():
            redacted = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", redacted)
        return redacted
