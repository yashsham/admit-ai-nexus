from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.config import settings
import json
import hashlib

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

from fastapi.responses import StreamingResponse
from app.observability.cost_tracking import verify_usage_limit

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: str = "general"
    dashboard_context: Optional[dict] = None
    user_id: Optional[str] = "default_user"

from app.ai.models.llm_factory import get_llm_with_fallback
from app.security.dependencies import get_current_user, User
from app.core.limiter import limiter
from app.core.cache import cache

async def get_optional_user(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    try:
        from app.security.service import auth_service
        user_data = auth_service.get_user(token)
        if user_data:
            return User(**user_data)
    except:
        pass
    return None

@router.post("/")
@limiter.limit("20/minute") # Increased limit for better UX
async def chat_endpoint(request: Request, body: ChatRequest, current_user: Optional[User] = Depends(get_optional_user)):
    try:
        from app.ai.models.agent_factory import get_counselor_agent, get_assistant_agent, get_model_priority
        from app.ai.components import PromptValidator, CostTracker
        
        # 0. Prompt Validation
        is_safe, reason = PromptValidator.validate(body.message)
        if not is_safe:
            return StreamingResponse(
                iter([f"I cannot process this request. Safety System: {reason}"]),
                media_type="text/plain"
            )

        # ----------------------------------------------------
        # DSA Optimization: Caching identical queries (O(1))
        # ----------------------------------------------------
        
        # WORKFLOW INTERCEPTION start
        # Check if this is a Campaign Creation step
        from app.workflows.campaign_chat import CampaignChatWorkflow
        
        # Determine User ID
        uid = current_user.id if current_user else (body.user_id or "public_guest")
        
        # Initialize Workflow
        campaign_workflow = CampaignChatWorkflow(user_id=uid)
        
        # Check for active state or trigger phrase
        wf_response = await campaign_workflow.process_message(body.message)
        
        if wf_response:
            # If workflow handled it, return immediately
            async def wf_gen():
                yield wf_response
            return StreamingResponse(wf_gen(), media_type="text/plain")
        # WORKFLOW INTERCEPTION end

        # We hash the message + context to create a reliable key
        query_hash = hashlib.md5((body.message + body.context + str(body.dashboard_context)).encode()).hexdigest()
        cache_key = f"llm_response:{query_hash}"
        
        cached_response = await cache.get(cache_key)
        if cached_response and isinstance(cached_response, str):
            # Return cached response instantly via generator for consistent frontend handling
            async def cache_gen():
                yield cached_response
            return StreamingResponse(cache_gen(), media_type="text/plain")
        
        # ----------------------------------------------------
        
        priority_models = get_model_priority()
        
        async def response_generator():
            last_error = None
            success = False
            full_response_text = ""
            
            for model_instance in priority_models:
                try:
                    # Select Agent
                    uid = current_user.id if current_user else "public_guest"
                    
                    if body.context == "counselor":
                        agent = get_counselor_agent(model=model_instance)
                    else:
                        agent = get_assistant_agent(
                            dashboard_context=body.dashboard_context, 
                            user_id=uid,
                            model=model_instance
                        )

                    # Try Streaming Response
                    # Use asyncio.wait_for to prevent indefinitely hanging LLM calls
                    import asyncio
                    
                    # We can't await generator, but we can wrap the iterator usage
                    resp_stream = agent.run(body.message, stream=True)
                    
                    for chunk in resp_stream:
                        success = True 
                        content_to_yield = None
                        
                        if hasattr(chunk, "content") and chunk.content:
                            content_to_yield = chunk.content
                        elif isinstance(chunk, str):
                            content_to_yield = chunk
                        
                        if content_to_yield:
                            stripped = content_to_yield.strip()
                            full_response_text += content_to_yield
                            
                            # Log Logic: Hide errors, format "Running"
                            if stripped.startswith("Error:") or "traceback" in stripped.lower():
                                continue
                            if stripped.startswith("Running:"):
                                action_name = stripped.replace("Running:", "").strip().split("(")[0]
                                yield f"\n> ⚡ *Processing {action_name}...*\n\n"
                                continue
                            if "create_campaign(" in stripped or "get_dashboard_stats(" in stripped:
                                continue
                                
                            yield content_to_yield
                    
                    if success:
                        # Cache the successful full response for future hits
                        if len(full_response_text) > 10: # Only cache meaningful responses
                             await cache.set(cache_key, full_response_text, ttl=3600) # Cache for 1 hour

                        break # Exit loop if successful
                        
                except Exception as e:
                    last_error = e
                    # print(f"[Model Fail] {type(model_instance).__name__}: {e}")
                    continue
            
            if not success:
                yield f"System Alert: Unable to generate response. (Error: {str(last_error)})"

        return StreamingResponse(response_generator(), media_type="text/plain")

    except Exception as e:
        print(f"Chat Endpoint Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
