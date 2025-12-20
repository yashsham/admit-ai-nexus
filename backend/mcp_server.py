
from mcp.server.fastmcp import FastMCP
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastMCP Server
mcp = FastMCP("Admit AI Nexus")

# --- Resources ---

@mcp.resource("admit://logs/backend")
def get_backend_logs() -> str:
    """Read the backend campaign debug log."""
    log_path = "campaign_debug.log"
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Log file not found."

@mcp.resource("admit://config")
def get_config() -> str:
    """Get the current safe configuration settings."""
    # Only expose safe settings
    return f"""
    Project: Admit AI Nexus
    Environment: {os.getenv('ENVIRONMENT', 'development')}
    """

# --- Tools ---

@mcp.tool()
def plan_campaign_strategy(goal: str) -> str:
    """
    Plan a marketing campaign based on a specific goal.
    Delegates to the CampaignCrew agents to create a strategy and draft content.
    """
    try:
        from app.services.campaign_crew import CampaignCrew
        crew = CampaignCrew(goal=goal)
        result = crew.plan_campaign()
        return str(result)
    except Exception as e:
        return f"Error planning campaign: {str(e)}"

@mcp.tool()
def analyze_campaign_performance(campaign_name: str, goal: str, metrics: dict) -> str:
    """
    Analyze campaign performance metrics and provide recommendations.
    Args:
        campaign_name: Name of the campaign
        goal: Original goal of the campaign
        metrics: Dictionary of metrics (e.g., {'open_rate': '20%', 'click_rate': '5%'})
    """
    try:
        from app.services.analytics_crew import AnalyticsCrew
        # Mocking campaign_id since it's not strictly needed for the analysis logic 
        # but required by the class.
        crew = AnalyticsCrew(campaign_id="mcp-analysis", campaign_data={"name": campaign_name, "goal": goal}, metrics=[metrics])
        result = crew.analyze()
        return str(result)
    except Exception as e:
        return f"Error analyzing campaign: {str(e)}"

@mcp.tool()
def system_health_check() -> str:
    """Check if the backend system dependencies are reachable."""
    status = {}
    
    # Check Database (Mock check for simplified MCP)
    status["database"] = "Unknown (Check manually via log)"
    
    # Check LLM API Keys presence
    status["groq_api_key"] = "Present" if os.getenv("GROQ_API_KEY") else "Missing"
    status["gemini_api_key"] = "Present" if os.getenv("GEMINI_API_KEY") else "Missing"
    
    return str(status)

if __name__ == "__main__":
    mcp.run()
