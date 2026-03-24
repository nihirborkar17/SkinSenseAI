import os
from dotenv import load_dotenv

class Settings:
    #Server
    PORT: int = int(os.getenv("PORT", 7000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Model
    MODEL_PATH: str = os.getenv("MODEL_PATH", "checkpoints/best_model.pth")
    DEVICE: str = os.getenv("DEVICE", "cpu")
    USE_TTA: bool = os.getenv("USE_TTA", "true").lower() == "true"
    
    # CORS
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:8000,http://localhost:5173"
    ).split(",")

settings = Settings()
