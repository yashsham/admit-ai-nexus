import requests
from app.core.config import settings
from typing import Optional, Dict, Any

class RetellService:
    def __init__(self):
        self.api_key = settings.RETELL_API_KEY
        self.agent_id = settings.RETELL_AGENT_ID
        self.base_url = "https://api.retellai.com"

    def trigger_outbound_call(self, phone_number: str, candidate_name: str, context: Optional[str] = None, document_content: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Triggers an outbound call using Retell AI.
        """
        if not self.api_key or not self.agent_id:
            return {"success": False, "error": "Retell API Key or Agent ID not configured"}

        url = f"{self.base_url}/create-phone-call"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Standardize phone number format if needed (Retell usually expects E.164)
        if not phone_number.startswith('+'):
             # Assume Indian for now or just pass as is if user provides it
             pass

        data = {
            "from_number": "+1234567890", # This should ideally be a purchased Retell number
            "to_number": phone_number,
            "override_agent_id": self.agent_id,
            "retell_llm_dynamic_variables": {
                "customer_name": candidate_name,
                "call_context": context or "",
                "document_content": document_content or ""
            }
        }
        
        if metadata:
            data["metadata"] = metadata

        try:
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            return {"success": True, "call_id": response.json().get("call_id"), "data": response.json()}
        except Exception as e:
            print(f"Retell Call Error: {e}")
            return {"success": False, "error": str(e)}

retell_service = RetellService()
