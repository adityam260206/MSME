from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from backend.app.core.config import settings
from backend.app.core.errors import AppException
from backend.app.db.base import Base
from backend.app.db.session import engine
from backend.app.models import *  # Ensure all models are registered
from backend.app.api.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup if not already created
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="MSME360 API",
    description="Integrated Business Management and Analytics Platform for MSMEs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error_code": exc.error_code,
            "details": exc.details,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append({"field": loc, "message": err.get("msg")})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Request validation failed",
            "error_code": "VALIDATION_ERROR",
            "details": errors,
        },
    )

# Public Health Check
@app.get("/api/health", tags=["Diagnostic"])
def health():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# Include all API routers
app.include_router(api_router, prefix=settings.API_V1_STR)
