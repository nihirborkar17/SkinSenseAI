from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add core directory to Python path
core_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'core')
sys.path.insert(0, core_path)

from app.config import settings
from app.routes import health, predict
from core.inference import SkinAnalyzer

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

# Load model on startup
@app.on_event("startup")
async def load_model():
    """Load the model when server starts"""
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

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, prefix="/api", tags=["Prediction"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "SkinSense AI Model API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
