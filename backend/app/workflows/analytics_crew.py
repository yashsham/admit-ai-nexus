from crewai import Agent, Task, Crew, Process, LLM
from config import GROQ_API_KEY
from typing import List, Dict

class AnalyticsCrew:
    def __init__(self, campaign_id: str, campaign_data: Dict, metrics: List[Dict]):
        self.campaign_id = campaign_id
        self.campaign_data = campaign_data
        self.metrics = metrics
        self.llm = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY
        )

    def analyze(self):
        # Agent: Data Analyst
        analyst = Agent(
            role='Campaign Data Analyst',
            goal='Derive actionable insights from campaign metrics',
            backstory='Expert data analyst who finds patterns in marketing data.',
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

        task_analysis = Task(
            description=f"""
            Analyze the following campaign data:
            Campaign: {self.campaign_data.get('name')}
            Goal: {self.campaign_data.get('goal')}
            Metrics: {self.metrics}

            Determine what is working, what isn't, and provide 3 specific recommendations for improvement.
            """,
            agent=analyst,
            expected_output="A JSON report with insights and recommendations."
        )

        crew = Crew(
            agents=[analyst],
            tasks=[task_analysis],
            verbose=True
            # process=Process.sequential (default)
        )

        return crew.kickoff()
