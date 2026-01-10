from phi.agent import Agent
from app.ai.models.agent_factory import get_model_priority
from typing import Dict, Any
import logging

logger = logging.getLogger("service.agno")

class CampaignAgno:
    """
    Replaces CampaignCrew (CrewAI) with Agno (Phidata) Agents.
    Supports Multi-Model Fallback.
    """
    def __init__(self, goal: str):
        self.goal = goal
        self.models = get_model_priority() # Get all valid models

    def plan_campaign(self) -> Dict[str, Any]:
        print(f"🚀 [CampaignAgno] Starting plan for: {self.goal}")
        
        last_error = None
        
        # Iterate through models (OpenRouter -> Gemini -> HuggingFace -> Groq)
        for model in self.models:
            try:
                model_name = type(model).__name__
                print(f"🔄 [CampaignAgno] Trying model: {model_name}")
                
                # 1. Campaign Strategist
                strategist = Agent(
                    model=model,
                    name="Campaign Strategist",
                    role="Senior Campaign Strategist",
                    description="You are an expert in student recruitment and marketing strategy.",
                    instructions=[
                        "Analyze the campaign goal.",
                        "Recommend the best channels (Email, WhatsApp, or Multi-channel) and a timeline.",
                        "Output your strategy clearly."
                    ],
                    markdown=True
                )

                # 2. Content Creator
                copywriter = Agent(
                    model=model,
                    name="Content Creator",
                    role="Creative Copywriter",
                    description="You write high-conversion copy for Gen-Z students.",
                    instructions=[
                        "Create a subject line and body for an email.",
                        "Create a short, punchy WhatsApp message.",
                        "Use the strategy provided by the Strategist."
                    ],
                    markdown=True
                )

                # Step 1: Strategy
                strategy_run = strategist.run(f"Develop a strategy for this goal: '{self.goal}'.", stream=False)
                strategy_text = strategy_run.content
                
                # Step 2: Content
                copy_run = copywriter.run(
                    f"Based on this strategy:\n\n{strategy_text}\n\nWrite 1 Email Draft (Subject + Body) and 1 WhatsApp message.",
                    stream=False
                )
                content_text = copy_run.content

                print(f"✅ [CampaignAgno] Success with {model_name}")
                return {
                    "plan": {
                        "strategy": strategy_text,
                        "content": content_text,
                        "provider": f"Agno ({model_name})"
                    }
                }
            
            except Exception as e:
                last_error = e
                logger.error(f"CampaignAgno failed with {type(model).__name__}: {e}")
                print(f"❌ [CampaignAgno] Failed with {type(model).__name__}, trying next...")
                continue
        
        # If all fail
        return {
            "plan": {
                "strategy": "Error generating plan.",
                "content": "Please check backend logs.",
                "error": str(last_error)
            }
        }
