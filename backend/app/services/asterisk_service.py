import asyncio
import logging
from panoramisk import Manager
from app.core.config import settings

logger = logging.getLogger(__name__)

class AsteriskService:
    def __init__(self):
        self.host = settings.ASTERISK_HOST or "localhost"
        self.port = int(settings.ASTERISK_PORT or 5038)
        self.user = settings.ASTERISK_USER or "admin"
        self.password = settings.ASTERISK_PASS or "secret"
        self.manager = Manager(
            loop=asyncio.get_event_loop(),
            host=self.host,
            port=self.port,
            username=self.user,
            secret=self.password
        )

    async def connect(self):
        """Establish connection to Asterisk Manager Interface"""
        try:
            await self.manager.connect()
            logger.info(f"Connected to Asterisk AMI at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Asterisk AMI: {e}")

    async def initiate_call(self, to_number: str, context: str = "from-internal", priority: int = 1, channel_vars: dict = None) -> str:
        """
        Originate a call via AMI.
        
        :param to_number: Destination number (e.g., SIP/1000 or PJSIP/alice)
        :param context: The context in dialplan to send the call to
        :param priority: The priority in dialplan
        :param channel_vars: Dictionary of variables to set on the channel
        :return: ActionID or error message
        """
        if not self.manager.authenticated:
            await self.connect()

        # Format number (simple assumption: if plain digits, assume PJSIP or SIP prefix needed, or passed as is)
        # For this implementation, we assume user passes full string like "PJSIP/1001" or we default only if digits.
        channel = to_number
        if to_number.isdigit():
             # Default to PJSIP for plain numbers
             channel = f"PJSIP/{to_number}"

        logger.info(f"Originating call to {channel} -> Context: {context}")

        try:
            # Prepare variables
            vars_str = ",".join([f"{k}={v}" for k, v in (channel_vars or {}).items()])
            
            action = {
                'Action': 'Originate',
                'Channel': channel,
                'Context': context,
                'Exten': 's', # Start at s or specific extension? Usually we originate to an app or context+exten
                'Priority': str(priority),
                'Async': 'true',
                'CallerID': 'AdmitAI Agent <1000>',
            }
            if vars_str:
                action['Variable'] = vars_str

            resp = await self.manager.send_action(action)
            
            if resp.success:
                return f"success_originate_{resp['ActionID']}"
            else:
                return f"failed_originate_{resp.get('Message', 'Unknown Error')}"

        except Exception as e:
            logger.error(f"Asterisk Originate Error: {e}")
            return f"error_exception_{str(e)}"

# Singleton
asterisk_service = AsteriskService()
