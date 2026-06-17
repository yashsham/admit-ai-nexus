from typing import Dict, Any, Optional
from app.ai.prompts.registry import prompt_registry
from app.ai.routing.router import model_router
from app.ai.guardrails.input import input_guard
from app.ai.guardrails.output import output_guard
from app.ai.pipelines.hitl import hitl_manager
from app.observability.metrics import metrics
from app.observability.cost_tracking import CostTracker
from app.observability.logging import audit_logger

# Import your LLM factory logic
from app.ai.models.llm_factory import get_llm_with_fallback

class AIPipeline:
    """
    Standardized AI Execution Pipeline.
    Steps:
    1. Input Guard (PII/Injection)
    2. Prompt Rendering (Versioning)
    3. Model Routing (Smart Selection)
    4. Execution (with Latency Tracking)
    5. Output Guard (Validation)
    6. HITL (Verification)
    7. Audit Logging
    """
    
    @metrics.measure("pipeline_execution")
    async def run(
        self, 
        user_id: str, 
        prompt_id: str, 
        context: Dict[str, Any], 
        complexity: str = "medium"
    ) -> Dict[str, Any]:
        """
        Executes a Full AI Task.
        Returns: { "success": bool, "data": ..., "meta": ... }
        """
        
        trace_id = None # Should generate one here
        
        # 1. Input Guardrails
        # Check inputs in context for safety
        for key, val in context.items():
            if isinstance(val, str):
                check = input_guard.validate(val)
                if not check["is_safe"]:
                    audit_logger.log_event("security_block", user_id, {"reason": check["reason"]}, trace_id)
                    raise ValueError(f"Security Rejection: {check['reason']}")
        
        # 2. Prompt Rendering
        # Retrieve strict versioned prompt
        prompt_data = prompt_registry.render(prompt_id, context, version="latest")
        
        # 3. Model Routing
        model_name = model_router.select_model(complexity)
        
        # 4. LLM Execution
        llm = get_llm_with_fallback(model_id=model_name)
        
        response_text = ""
        # Simulate LLM Call (Replace with real invoke)
        try:
            # Metric: TTFT would be measured inside stream callback
            # Here we measure total model time
            # response = await llm.ainvoke(...)
            # response_text = response.content
            pass 
        except Exception as e:
            # Retry / Fallback Logic handled by LLM Factory or here
            raise e

        # Mock response for now as we don't have real LLM connected in this script
        response_text = '{"subject": "Hello", "body": "Welcome"}' 

        # 5. Output Guardrails
        # Validate against schema if prompt has output_schema defined (TODO)
        
        # 6. HITL Check
        # Example: If confidence low (simulated)
        confidence = 0.95 # Mock
        hitl_check = await hitl_manager.create_approval_request(
            user_id, 
            "content_generation", 
            {"prompt_id": prompt_id, "output": response_text}, 
            confidence_score=confidence
        )
        
        if hitl_check["requires_approval"]:
            return {
                "status": "pending_approval",
                "request_id": hitl_check["request_id"],
                "message": "Content generated but requires human review."
            }

        # 7. Final Logging & Cost
        # Estimate tokens (Mock)
        in_tok = len(str(context)) / 4
        out_tok = len(response_text) / 4
        await CostTracker.track_usage(user_id, model_name, int(in_tok), int(out_tok))
        
        return {
            "status": "success",
            "data": response_text,
            "meta": {
                "model": model_name,
                "prompt_version": prompt_data["version"]
            }
        }

pipeline = AIPipeline()
