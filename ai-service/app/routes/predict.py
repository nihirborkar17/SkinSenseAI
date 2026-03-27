from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from PIL import Image
import io
from typing import Optional
from datetime import datetime

router = APIRouter()

# Global analyzer instance (loaded once at startup)
analyzer = None

def get_analyzer():
    """Get the global analyzer instance"""
    global analyzer
    if analyzer is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    return analyzer

@router.post("/predict")
async def predict_skin_condition(
    image: UploadFile = File(..., description="Skin image to analyze"),
    consentId: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None)
):
    """
    Analyze skin image and return prediction
    
    Expected by Express backend:
    {
      "success": true,
      "prediction": {
        "condition": "Melanoma",
        "confidence": 0.873,
        "top_predictions": [...]
      },
      "metadata": {...}
    }
    """
    try:
        # Validate image file
        if not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image (JPEG/PNG)"
            )
        
        # Read and convert image
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Get analyzer and run prediction
        model_analyzer = get_analyzer()
        result = model_analyzer.analyze(pil_image)
        
        # Transform to Express backend format
        response = {
            "success": True,
            "prediction": {
                "condition": result["top_class_full"],
                "confidence": result["confidence"] / 100.0,  # Convert to 0-1 range
                "severity_label": result["severity_label"],
                "severity_level": result["severity_level"],
                "severity_color": result["severity_color"],
                "severity_score": result["severity_score"],
                "top_class": result["top_class"],
                "top_predictions": [
                    {
                        "condition": pred["full_name"],
                        "class_code": pred["class"],
                        "confidence": pred["probability"] / 100.0  # Convert to 0-1
                    }
                    for pred in result["all_classes"][:5]  # Top 5 predictions
                ],
                "disclaimer": result["disclaimer"]
            },
            "metadata": {
                "consent_id": consentId,
                "timestamp": timestamp or datetime.utcnow().isoformat() + "Z",
                "processing_time": None  # Can add timing if needed
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )
