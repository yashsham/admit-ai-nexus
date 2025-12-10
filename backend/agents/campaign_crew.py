from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq
from config import GROQ_API_KEY
from typing import Dict, Any

class CampaignCrew:
    def __init__(self, goal: str):
        self.goal = goal
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY
        )

    def plan_campaign(self) -> Dict[str, Any]:
        # Agent: Campaign Strategist
        strategist = Agent(
            role='Senior Campaign Strategist',
            goal='Plan high-conversion admission campaigns',
            backstory='Expert in higher education marketing and student recruitment.',
            verbose=False,
            allow_delegation=False,
            llm=self.llm
        )

        # Agent: Content Creator
        writer = Agent(
            role='Content Creator',
            goal='Write compelling copy for emails and whatsapp',
            backstory='Creative copywriter specializing in Gen-Z communication.',
            verbose=False,
            allow_delegation=False,
            llm=self.llm
        )

        # Task 1: Strategy
        task_strategy = Task(
            description=f"Analyze the goal: '{self.goal}'. Determine the best channels (Email, WhatsApp, or Voice) and creating a timeline.",
            agent=strategist,
            expected_output="A JSON-like summary of channels and timeline."
        )

        # Task 2: Content
        task_content = Task(
            description="Create 1 email draft and 1 short WhatsApp message based on the strategy.",
            agent=writer,
            expected_output="Drafts for communication."
        )

        crew = Crew(
            agents=[strategist, writer],
            tasks=[task_strategy, task_content],
            verbose=False,
            process=Process.sequential,
            manager_llm=self.llm
        )

        result = crew.kickoff()
        return {"plan": result}
