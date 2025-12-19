from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.config import settings

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: str = "general"

from app.core.llm_factory import get_llm_with_fallback

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    try:
        # 1. Initialize LLM with Fallback
        llm = get_llm_with_fallback(temperature=0.7)

        # 2. System Prompts
        system_prompt_text = "You are AdmitConnect AI, a helpful college admission assistant."
        
        if request.context == "counselor":
            system_prompt_text = """You are the AdmitConnect AI College Counselor.
            Strictly focus on college admissions, scholarships, and academic guidance.
            Refuse to answer non-education topics politely.
            Use Markdown formatting."""
        elif request.context == "dashboard":
             system_prompt_text = "You are the AdmitConnect Dashboard Expert. Help users manage their campaigns."

        # 3. Build Messages
        messages = [SystemMessage(content=system_prompt_text)]
        
        for msg in request.history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
            elif msg.role == "system":
                messages.append(SystemMessage(content=msg.content))
        
        # Add current message
        messages.append(HumanMessage(content=request.message))

        # 4. Invoke
        response = llm.invoke(messages)
        
        return {
            "content": response.content,
            "sources": [] # Placeholder for future RAG
        }

    except Exception as e:
        print(f"Chat Endpoint Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
