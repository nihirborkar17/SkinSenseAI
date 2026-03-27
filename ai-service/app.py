"""
main.py — SkinAI FastAPI Backend
CNN inference + RAG chatbot (OpenAI or Anthropic, switchable).

Endpoints:
  POST /api/analyze              — image → prediction + session_id
  POST /api/chat                 — question → RAG answer
  GET  /api/chat/suggest/{id}    — suggested questions
  DELETE /api/chat/{id}          — reset chat history
  GET  /api/health               — health check
"""

import io
import os
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from PIL import Image

from core.inference import SkinAnalyzer


# ── Config ─────────────────────────────────────────────────────────────────────
CNN_CHECKPOINTS = os.getenv("CNN_CHECKPOINTS", "checkpoints/best_model.pth").split(",")
DEVICE          = os.getenv("DEVICE", "cuda" if __import__("torch").cuda.is_available() else "cpu")
USE_TTA         = os.getenv("USE_TTA",         "true").lower() == "true"
MAX_FILE_MB     = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
LLM_PROVIDER    = os.getenv("LLM_PROVIDER",    "ollama")    # "openai" | "anthropic"
LLM_MODEL       = os.getenv("LLM_MODEL",       "llama3")
CHROMA_DIR      = os.getenv("CHROMA_PERSIST_DIR", "data/chromadb")

app_state:      dict = {}
active_sessions: dict = {}


# ── Startup ────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n{'='*50}")
    print(f"  SkinAI API")
    print(f"  Device  : {DEVICE}  |  TTA: {USE_TTA}")
    print(f"  LLM     : {LLM_PROVIDER}/{LLM_MODEL}")
    print(f"{'='*50}\n")

    # CNN
    print("Loading CNN model...")
    app_state["analyzer"] = SkinAnalyzer(
        checkpoint_paths=CNN_CHECKPOINTS,
        device=DEVICE,
        use_tta=USE_TTA,
    )

    # RAG — optional, won't crash if KB is empty or keys are missing
    print("Loading RAG pipeline...")
    try:
        from knowledge_base import KnowledgeBase
        from rag_pipeline import DermRAGPipeline, build_llm_backend

        kb  = KnowledgeBase(persist_dir=CHROMA_DIR)
        llm = build_llm_backend(LLM_PROVIDER, LLM_MODEL)
        app_state["rag"] = DermRAGPipeline(kb=kb, llm_backend=llm)
        print(f"  RAG ready. KB stats: {kb.get_stats()}")
    except Exception as e:
        print(f"  RAG unavailable: {e}")
        print("  /api/chat will return 503. /api/analyze works normally.")
        app_state["rag"] = None

    print("\nAll systems ready.\n")
    yield
    app_state.clear()
    active_sessions.clear()


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SkinAI API",
    description="Skin condition analysis — CNN + RAG chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message:    str  = Field(..., min_length=1, max_length=2000)
    stream:     bool = False


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status":       "ok",
        "device":       DEVICE,
        "model_loaded": "analyzer" in app_state,
        "rag_loaded":   app_state.get("rag") is not None,
        "use_tta":      USE_TTA,
    }


# ── Analyze ────────────────────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze_image(
    image:     UploadFile    = File(...),
    consentId: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None),
):
    """
    Receives multipart/form-data from Node.js ai.service.ts.
    Field 'image' must match exactly what ai.service.ts sends.
    Returns AIAnalyzeResponse shape expected by Node.js.
    """
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if image.content_type and image.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {image.content_type}")

    contents = await image.read()
    if len(contents) == 0:
        raise HTTPException(400, "Empty file.")
    if len(contents) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_FILE_MB}MB.")

    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not decode image.")

    try:
        result = app_state["analyzer"].analyze(pil_image)
    except Exception as e:
        raise HTTPException(500, f"Inference failed: {e}")

    # Create RAG session for chat
    session_id = str(uuid.uuid4())
    suggested  = []
    if app_state.get("rag"):
        rag     = app_state["rag"]
        session = rag.create_session(
            condition_code=result["top_class"],
            confidence=result["confidence"],
            severity_label=result["severity_label"],
        )
        active_sessions[session_id] = session
        suggested = rag.get_suggested_questions(result["top_class"])

    return {
        "success": True,
        "prediction": {
            "condition":      result["top_class_full"],
            "confidence":     round(result["confidence"] / 100, 4),
            "severity_label": result["severity_label"],
            "severity_level": result["severity_level"],
            "severity_color": result["severity_color"],
            "severity_score": result["severity_score"],
            "top_class":      result["top_class"],
            "top_predictions": [
                {
                    "condition":  c["full_name"],
                    "class_code": c["class"],
                    "confidence": round(c["probability"] / 100, 4),
                    "color":      c["color"],
                }
                for c in result["all_classes"]
            ],
            "disclaimer":          result["disclaimer"],
            "session_id":          session_id,
            "suggested_questions": suggested,
            "rag_available":       app_state.get("rag") is not None,
        },
        "metadata": {
            "consent_id": consentId,
            "timestamp":  timestamp,
        },
    }


# ── Chat ───────────────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Answers questions about the detected condition using RAG.
    session_id comes from /api/analyze response.
    Supports streaming via stream=true.
    """
    if app_state.get("rag") is None:
        raise HTTPException(503,
            "RAG pipeline not available. Check LLM API key and run "
            "knowledge_base.py to build the vector store.")

    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(404,
            "Session not found. Please analyse an image first to start a chat.")

    rag = app_state["rag"]

    if req.stream:
        async def event_stream() -> AsyncGenerator[str, None]:
            for token in rag.chat(session, req.message, stream=True):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    answer = rag.chat(session, req.message, stream=False)
    return {
        "answer":     answer,
        "session_id": req.session_id,
        "condition":  session.condition_code,
    }


# ── Suggest questions ──────────────────────────────────────────────────────────
@app.get("/api/chat/suggest/{session_id}")
async def suggest_questions(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    rag = app_state.get("rag")
    if not rag:
        raise HTTPException(503, "RAG not available.")
    return {
        "questions":  rag.get_suggested_questions(session.condition_code),
        "condition":  session.condition_code,
        "session_id": session_id,
    }


# ── Reset chat ─────────────────────────────────────────────────────────────────
@app.delete("/api/chat/{session_id}")
async def reset_chat(session_id: str):
    session = active_sessions.get(session_id)
    if session and app_state.get("rag"):
        app_state["rag"].reset_session(session)
    return {"status": "reset", "session_id": session_id}