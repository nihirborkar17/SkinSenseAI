# app/routes/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sys
import os

# Add core to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'core'))

from core.knowledge_base import KnowledgeBase
from core.rag_pipeline import DermRAGPipeline, build_llm_backend

router = APIRouter()

# Global instances (loaded once at startup)
kb_instance = None
rag_pipeline = None

class ChatRequest(BaseModel):
    disease: str
    question: str
    assessmentId: str
    consentId: str
    session_history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    success: bool
    answer: str
    sources: List[str]
    suggested_questions: List[str]
    context: Optional[str] = None

def get_kb():
    """Get the global knowledge base instance"""
    global kb_instance
    if kb_instance is None:
        raise HTTPException(status_code=500, detail="Knowledge base not loaded")
    return kb_instance

def get_rag():
    """Get the global RAG pipeline instance"""
    global rag_pipeline
    if rag_pipeline is None:
        raise HTTPException(status_code=500, detail="RAG pipeline not initialized")
    return rag_pipeline

@router.post("/chat", response_model=ChatResponse)
async def chat_with_rag(request: ChatRequest):
    """
    Chat endpoint using RAG system
    
    Expected request:
    {
      "disease": "melanoma",
      "question": "What causes melanoma?",
      "assessmentId": "uuid",
      "consentId": "uuid"
    }
    """
    try:
        # Map disease name to condition code
        disease_map = {
            "melanoma": "MEL",
            "melanocytic nevus": "NV",
            "melanocytic nevi": "NV",
            "basal cell carcinoma": "BCC",
            "actinic keratosis": "AK",
            "actinic keratoses": "AK",
            "benign keratosis": "BKL",
            "benign keratosis-like lesions": "BKL",
            "dermatofibroma": "DF",
            "vascular lesion": "VASC",
            "vascular lesions": "VASC",
        }
        
        condition_code = disease_map.get(request.disease.lower())
        
        if not condition_code:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown condition: {request.disease}"
            )
        
        # Get RAG pipeline
        rag = get_rag()
        
        # Create or restore session
        # For now, create new session each time
        # TODO: Implement session persistence
        session = rag.create_session(
            condition_code=condition_code,
            confidence=85.0,  # Default, should come from assessment
            severity_label="Medium"  # Default, should come from assessment
        )
        
        # Restore history if provided
        if request.session_history:
            session.history = request.session_history
        
        # Get answer from RAG
        answer = rag.chat(
            session=session,
            user_query=request.question,
            stream=False,
            max_tokens=800
        )
        
        # Get suggested questions
        suggested = rag.get_suggested_questions(condition_code)
        
        # Get sources from last retrieval
        kb = get_kb()
        chunks = kb.retrieve(request.question, condition_code, top_k=3)
        sources = list(set(chunk["source"] for chunk in chunks))
        
        return ChatResponse(
            success=True,
            answer=answer,
            sources=sources,
            suggested_questions=suggested[:3],
            context=f"Based on {len(chunks)} reference documents"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat failed: {str(e)}"
        )

@router.get("/chat/suggestions/{condition_code}")
async def get_suggestions(condition_code: str):
    """Get suggested questions for a condition"""
    try:
        rag = get_rag()
        questions = rag.get_suggested_questions(condition_code.upper())
        return {
            "success": True,
            "condition": condition_code,
            "suggestions": questions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggestions: {str(e)}"
        )
