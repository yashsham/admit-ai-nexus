from typing import Any, Dict, Optional, Type
import json
import logging
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("guardrails.output")

class OutputGuard:
    """
    Post-flight checks for AI outputs.
    - JSON Schema Validation
    - Hallucination Checks (Self-Consistency or RefCheck - Placeholder here)
    - Banned content filtering
    """
    
    def validate_schema(self, response_text: str, schema_model: Type[BaseModel]) -> Optional[BaseModel]:
        """
        Ensures the output matches a Pydantic model.
        Attempts to fix common JSON errors.
        """
        # 1. Extract JSON
        clean_json = self._extract_json(response_text)
        
        try:
            data = json.loads(clean_json)
            obj = schema_model(**data)
            return obj
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Schema Validation Failed: {e}")
            return None
            
    def _extract_json(self, text: str) -> str:
        """Helper to extract JSON from markdown code blocks"""
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            return text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            return text[start:end].strip()
        return text.strip()

    def check_hallucination(self, response: str, source_docs: list[str]) -> bool:
        """
        Simplified Hallucination Check.
        In prod, use RAGAS or Self-Consistency prompting.
        """
        # For now, we assume true if passing schema
        return True

output_guard = OutputGuard()
