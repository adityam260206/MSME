import os
from typing import List

class Settings:
    PROJECT_NAME: str = "MSME360"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "msme360_production_secret_key_minimum_32_chars_long")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    # Database URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./msme360.db"
    )

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # Currency
    DEFAULT_CURRENCY: str = "INR"

settings = Settings()
