"""
main.py — SkinAI FastAPI Backend (CNN only, no RAG)
All core files (dataset.py, model.py, inference.py) live in the core/ subfolder.

Endpoints:
  POST /api/analyze  — receives image → returns prediction JSON
  GET  /api/health   — health check
"""

import io
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from core.inference import SkinAnalyzer


# ── Config ─────────────────────────────────────────────────────────────────────
CNN_CHECKPOINTS = os.getenv("CNN_CHECKPOINTS", "checkpoints/best_model.pth").split(",")
DEVICE          = os.getenv("DEVICE", "cuda" if __import__("torch").cuda.is_available() else "cpu")
USE_TTA         = os.getenv("USE_TTA", "true").lower() == "true"
MAX_FILE_MB     = int(os.getenv("MAX_FILE_SIZE_MB", "10"))

app_state: dict = {}


# ── Startup ────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n{'='*50}")
    print(f"  SkinAI — CNN Inference Server")
    print(f"  Device     : {DEVICE}")
    print(f"  Checkpoint : {CNN_CHECKPOINTS}")
    print(f"  TTA        : {USE_TTA}")
    print(f"{'='*50}\n")

    print("Loading model...")
    app_state["analyzer"] = SkinAnalyzer(
        checkpoint_paths=CNN_CHECKPOINTS,
        device=DEVICE,
        use_tta=USE_TTA,
    )
    print("Model ready.\n")
    yield
    app_state.clear()


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SkinAI API",
    description="Skin condition analysis — EfficientNetB4 CNN",
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


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status":       "ok",
        "device":       DEVICE,
        "model_loaded": "analyzer" in app_state,
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
    Field names:
      image     : the image file (JPEG / PNG) — must be named 'image'
      consentId : optional tracking ID
      timestamp : optional ISO timestamp

    Returns JSON matching AIAnalyzeResponse shape in Node.js:
    {
      success: true,
      prediction: {
        condition, confidence, severity_label, severity_level,
        severity_color, severity_score, top_class,
        top_predictions: [{condition, class_code, confidence, color}],
        disclaimer
      },
      metadata: { consent_id, timestamp }
    }
    """

    # Validate content type
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if image.content_type and image.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {image.content_type}. Use JPEG or PNG.")

    # Read bytes
    contents = await image.read()
    if len(contents) == 0:
        raise HTTPException(400, "Empty file received.")
    if len(contents) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_FILE_MB}MB.")

    # Decode to PIL
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not decode image. Send a valid JPEG or PNG.")

    # Run inference
    try:
        result = app_state["analyzer"].analyze(pil_image)
    except Exception as e:
        raise HTTPException(500, f"Inference failed: {str(e)}")

    # Return in the exact shape Node.js expects
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
            "disclaimer": result["disclaimer"],
        },
        "metadata": {
            "consent_id": consentId,
            "timestamp":  timestamp,
        },
    }