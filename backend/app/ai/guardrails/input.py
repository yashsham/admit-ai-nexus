import re
from typing import Optional, List, Dict
import logging

logger = logging.getLogger("guardrails.input")

class InputGuard:
    """
    Pre-flight checks for user inputs.
    - PII Detection (Basic)
    - Jailbreak/Injection Detection (Keyword based)
    - Length Limits
    """
    
    # Simple regex for PII (Demo purposes - use a reliable library like Presidio in prod)
    EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_REGEX = r"\+?[0-9]{10,15}"
    
    # Known jailbreak keywords
    JAILBREAK_KEYWORDS = ["ignore previous instructions", "system override", "you are now DAN"]

    def sanitize(self, text: str, redact_pii: bool = False) -> str:
        """
        Sanitize input text.
        """
        if redact_pii:
            text = re.sub(self.EMAIL_REGEX, "<EMAIL_REDACTED>", text)
            text = re.sub(self.PHONE_REGEX, "<PHONE_REDACTED>", text)
        return text

    def validate(self, text: str) -> Dict[str, bool]:
        """
        Returns validation result.
        { "is_safe": bool, "reason": str }
        """
        # 1. Length Check
        if len(text) > 10000:
             return {"is_safe": False, "reason": "Input too long (>10k chars)"}
             
        # 2. Jailbreak Check
        lower_text = text.lower()
        for keyword in self.JAILBREAK_KEYWORDS:
            if keyword in lower_text:
                logger.warning(f"Jailbreak attempt detected: {keyword}")
                return {"is_safe": False, "reason": "Potential Prompt Injection Detected"}
                
        return {"is_safe": True, "reason": "OK"}

input_guard = InputGuard()
