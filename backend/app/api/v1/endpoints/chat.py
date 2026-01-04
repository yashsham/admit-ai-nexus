from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.config import settings
import json

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

from fastapi.responses import StreamingResponse
from app.core.usage import verify_usage_limit

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: str = "general"
    dashboard_context: Optional[dict] = None
    user_id: Optional[str] = "default_user"

from app.core.llm_factory import get_llm_with_fallback

from app.services.auth.dependencies import get_current_user, User
from app.core.limiter import limiter

@router.post("/")
@limiter.limit("10/minute")
async def chat_endpoint(request: Request, body: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        from app.core.agent_factory import get_counselor_agent, get_assistant_agent, get_model_priority
        
        from app.services.ai.components import PromptValidator, CostTracker
        
        # 0. Prompt Validation
        is_safe, reason = PromptValidator.validate(body.message)
        if not is_safe:
            print(f"[Security] Request Blocked: {reason}")
            return StreamingResponse(
                iter([f"I cannot process this request. Safety System: {reason}"]),
                media_type="text/plain"
            )

        # 1. Get List of Models (Gemini -> HF -> Groq)
        priority_models = get_model_priority()
        
        async def response_generator():
            last_error = None
            success = False
            full_response_text = ""
            
            for model_instance in priority_models:
                try:
                    # Select Agent with specific model
                    if body.context == "counselor":
                        agent = get_counselor_agent(model=model_instance)
                        prompt = body.message
                    else:
                        # Pass user_id to the agent factory to inject into tools
                        agent = get_assistant_agent(
                            dashboard_context=body.dashboard_context, 
                            user_id=current_user.id,
                            model=model_instance
                        )
                        prompt = body.message

                    # Log internal switch
                    # yield f"\n<!-- Switching to model: {type(model_instance).__name__} -->\n"

                    # Try Streaming Response
                    resp_stream = agent.run(prompt, stream=True)
                    
                    for chunk in resp_stream:
                        success = True # If we got first chunk, connection is good
                        content_to_yield = None
                        
                        if hasattr(chunk, "content") and chunk.content:
                            content_to_yield = chunk.content
                        elif isinstance(chunk, str):
                            content_to_yield = chunk
                        
                        # Process Visibility Logic
                        if content_to_yield:
                            stripped = content_to_yield.strip()
                            full_response_text += content_to_yield
                            
                            # 1. Hide Internal JSON Errors or Raw Tool Outputs if needed
                            if stripped.startswith("Error:") or "traceback" in stripped.lower():
                                print(f"[Internal Log] Hidden Error: {stripped}")
                                continue

                            # 2. Format "Running:" logs as "Thinking..."
                            if stripped.startswith("Running:"):
                                action_name = stripped.replace("Running:", "").strip().split("(")[0]
                                display_map = {
                                    "web_search": "Searching the web...",
                                    "create_campaign": "Setting up campaign...",
                                    "get_dashboard_stats": "Analyzing dashboard data..."
                                }
                                # Default friendly message
                                action_display = display_map.get(action_name, f"Processing {action_name}...")
                                
                                # Send styled "Thinking" block
                                yield f"\n> ⚡ *{action_display}*\n\n"
                                continue
                            
                            # 3. Filter raw signatures
                            if "create_campaign(" in stripped or "get_dashboard_stats(" in stripped:
                                continue
                                
                            yield content_to_yield
                    
                    if success:
                        # Track Cost (Estimate)
                        try:
                            # 1 token ~= 4 chars
                            input_est = len(prompt) / 4
                            output_est = len(full_response_text) / 4
                            CostTracker.track_request("auto-selected", int(input_est), int(output_est))
                        except Exception: pass
                        break # Exit loop if successful
                        
                except Exception as e:
                    last_error = e
                    print(f"[Model Fallback] {type(model_instance).__name__} failed: {e}")
                    # Optional: Notify user of invisible switch?
                    # yield f"> *System: Switching AI model due to high traffic...*\n\n"
                    continue
            
            if not success:
                yield f"\nI apologize, but all AI services are currently unavailable. Please check the backend logs. (Error: {str(last_error)})"

        return StreamingResponse(response_generator(), media_type="text/plain")

    except Exception as e:
        print(f"Chat Endpoint Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
