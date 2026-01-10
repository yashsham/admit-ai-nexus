from enum import Enum
from typing import Dict, Any, Optional
import os
import random

# Reuse cost tracker constants ideally, but for now self-contained
class ModelTier(str, Enum):
    CHEAP = "cheap"       # Groq (Llama 3 8B)
    BALANCED = "balanced" # Gemini Flash / Llama 70B
    PREMIUM = "premium"   # GPT-4o / Claude 3.5 Sonnet

class ModelRouter:
    """
    Routes AI tasks to the most appropriate model based on:
    - Complexity (simple vs complex)
    - Budget Tier
    - Availability (Fallback logic)
    """
    
    MODELS = {
        ModelTier.CHEAP: ["llama-3.1-8b-instant"],
        ModelTier.BALANCED: ["llama-3.3-70b-versatile", "gemini-2.0-flash"],
        ModelTier.PREMIUM: ["gpt-4o", "claude-3-5-sonnet"]
    }
    
    def __init__(self):
        # We could load availability status from Redis here
        pass
        
    def select_model(
        self, 
        complexity: str = "low", 
        requirements: Dict[str, bool] = None
    ) -> str:
        """
        Selects the best model.
        
        Args:
            complexity: 'low', 'medium', 'high'
            requirements: {'json_mode': True, 'vision': False}
        """
        requirements = requirements or {}
        
        # 1. Determine Tier
        tier = ModelTier.CHEAP
        if complexity == "high":
            tier = ModelTier.PREMIUM
        elif complexity == "medium":
            tier = ModelTier.BALANCED
            
        # 2. Filter Candidates based on Requirements
        candidates = self.MODELS[tier]
        
        # Example Requirement Filter: Vision
        if requirements.get("vision", False):
            if tier == ModelTier.CHEAP:
                # Upgrade tier if cheap models don't support vision
                candidates = ["gemini-2.0-flash"] 
            elif tier == ModelTier.BALANCED:
                candidates = ["gemini-2.0-flash"]
            elif tier == ModelTier.PREMIUM:
                candidates = ["gpt-4o", "claude-3-5-sonnet"]
                
        # 3. Load Balancing / Availability Check
        # (Simple random choice for now, could be Round Robin or Latency-based)
        selected = random.choice(candidates)
        
        return selected

    def get_fallback(self, failed_model: str) -> Optional[str]:
        """
        Returns a fallback model if the primary fails.
        Strategy: Same Tier Alternate -> Next Tier Up.
        """
        # Simple hardcoded chains for robustness
        fallback_chains = {
            "llama-3.1-8b-instant": "llama-3.3-70b-versatile",
            "llama-3.3-70b-versatile": "gemini-2.0-flash",
            "gemini-2.0-flash": "gpt-4o",
            "gpt-4o": None # End of line
        }
        return fallback_chains.get(failed_model)

model_router = ModelRouter()
