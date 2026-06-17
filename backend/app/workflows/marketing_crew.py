from crewai import Agent, Task, Crew, Process, LLM
from langchain.tools import tool
from services.tools import send_whatsapp_message, send_email, make_voice_call
from config import GROQ_API_KEY

# Wrap tools for CrewAI
class MarketingTools:
    @tool("Send WhatsApp")
    def send_whatsapp(to_number: str, message: str):
        """Sends a WhatsApp message to a specific number."""
        return send_whatsapp_message(to_number, message)

    @tool("Send Email")
    def send_email_tool(to_email: str, subject: str, body: str):
        """Sends an email to a specific address."""
        return send_email(to_email, subject, body)
    
    @tool("Make Voice Call")
    def make_call_tool(to_number: str, script: str):
        """Initiates a voice call with a script."""
        return make_voice_call(to_number, script)

class MarketingCrew:
    def __init__(self, campaign_data: dict, recipients: list):
        self.campaign_data = campaign_data
        self.recipients = recipients
        self.llm = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY
        )

    def execute(self):
        # Agent: Executor
        executor = Agent(
            role='Marketing Automation Specialist',
            goal='Execute campaign actions accurately and efficiently',
            backstory='Technical specialist who manages campaign delivery across channels.',
            verbose=True,
            allow_delegation=False,
            tools=[MarketingTools.send_whatsapp, MarketingTools.send_email_tool, MarketingTools.make_call_tool],
            llm=self.llm
        )

        # Create tasks dynamically based on recipients
        tasks = []
        for recipient in self.recipients:
            # Logic to determine channel for this recipient would go here
            # For simplicity, we assume we want to just send a WhatsApp if phone exists
            if recipient.get("phone"):
                task = Task(
                    description=f"Send WhatsApp to {recipient['phone']} with message: {self.campaign_data.get('message_content', 'Hello from Admit AI')}",
                    agent=executor,
                    expected_output="Confirmation of sent message."
                )
                tasks.append(task)

        if not tasks:
            return "No tasks to execute"

        crew = Crew(
            agents=[executor],
            tasks=tasks,
            verbose=True,
            process=Process.sequential
        )

        return crew.kickoff()
