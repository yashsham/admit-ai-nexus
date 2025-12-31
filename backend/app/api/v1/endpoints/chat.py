from fastapi import APIRouter, HTTPException, Depends
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

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    try:
        from app.core.agent_factory import get_counselor_agent, get_assistant_agent, get_model_priority
        
        # 1. Get List of Models (Gemini -> HF -> Groq)
        priority_models = get_model_priority()
        
        async def response_generator():
            last_error = None
            success = False
            
            for model_instance in priority_models:
                try:
                    # Select Agent with specific model
                    if request.context == "counselor":
                        agent = get_counselor_agent(model=model_instance)
                        prompt = request.message
                    else:
                        # Pass user_id to the agent factory to inject into tools
                        agent = get_assistant_agent(
                            dashboard_context=request.dashboard_context, 
                            user_id=request.user_id,
                            model=model_instance
                        )
                        prompt = request.message

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
