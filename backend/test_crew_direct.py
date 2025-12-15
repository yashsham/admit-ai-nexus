from agents.campaign_crew import CampaignCrew
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing CampaignCrew...")
try:
    crew = CampaignCrew("Increase admissions for Computer Science")
    print("Crew initialized.")
    result = crew.plan_campaign()
    print("Plan created successfully!")
    print(result)
except Exception as e:
    print(f"Error: {e}")
