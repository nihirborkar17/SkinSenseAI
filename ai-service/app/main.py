from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add core directory to Python path
core_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'core')
sys.path.insert(0, core_path)

from app.config import settings
from app.routes import health, predict, chat
from core.inference import SkinAnalyzer
from core.knowledge_base import KnowledgeBase
from core.rag_pipeline import DermRAGPipeline, build_llm_backend

# Create FastAPI app
app = FastAPI(
    title="SkinSense AI Model API",
    description="Skin condition prediction service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and RAG on startup
@app.on_event("startup")
async def load_model():
    """Load the AI model and RAG system when server starts"""
    # 1. Load prediction model
    print("=" * 60)
    print("Loading SkinAnalyzer model...")
    print(f"Model path: {settings.MODEL_PATH}")
    print(f"Device: {settings.DEVICE}")
    print(f"Use TTA: {settings.USE_TTA}")
    
    try:
        predict.analyzer = SkinAnalyzer(
            checkpoint_paths=[settings.MODEL_PATH],
            device=settings.DEVICE,
            use_tta=settings.USE_TTA,
        )
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise
    
    # 2. Load knowledge base
    print("=" * 60)
    print("Loading Knowledge Base...")
    kb_dir = os.getenv("KB_DIR", "data/knowledge_base")
    chromadb_dir = os.getenv("CHROMADB_DIR", "data/chromadb")
    
    try:
        kb = KnowledgeBase(persist_dir=chromadb_dir)
        chat.kb_instance = kb
        
        # Check if KB is empty, ingest if needed
        stats = kb.get_stats()
        if stats["total_chunks"] == 0:
            print(f"⚠️  Knowledge base is empty")
            print(f"   Run: python core/knowledge_base.py --kb_dir {kb_dir}")
            print(f"   Or add PDFs to: {kb_dir}/<CONDITION_CODE>/")
        else:
            print(f"✅ Knowledge base loaded: {stats['total_chunks']} chunks")
            print(f"   Conditions: {list(stats['per_condition'].keys())}")
        
    except Exception as e:
        print(f"❌ Failed to load knowledge base: {e}")
        raise
    
    # 3. Initialize RAG pipeline
    print("=" * 60)
    print("Initializing RAG Pipeline...")
    llm_provider = os.getenv("LLM_PROVIDER", "ollama")
    llm_model = os.getenv("LLM_MODEL", "phi3")
    top_k = int(os.getenv("TOP_K_CHUNKS", "5"))
    
    try:
        llm_backend = build_llm_backend(llm_provider, llm_model)
        rag = DermRAGPipeline(kb=kb, llm_backend=llm_backend, top_k=top_k)
        chat.rag_pipeline = rag
        
        print(f"✅ RAG pipeline ready!")
        print(f"   Provider: {llm_provider}")
        print(f"   Model: {llm_model}")
        print(f"   Top-K chunks: {top_k}")
    except Exception as e:
        print(f"❌ Failed to initialize RAG: {e}")
        raise
    
    print("=" * 60)
    print("🚀 All services loaded successfully!")
    print("=" * 60)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, prefix="/api", tags=["Prediction"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "SkinSense AI Model API",
        "docs": "/docs",
        "health": "/health",
        "services": ["prediction", "chat"],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
