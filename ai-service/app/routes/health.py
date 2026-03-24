from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
            "status" : "Healthy",
            "service" : "SkinSense AI Model",
            "version" : "1.0.0"
            }
