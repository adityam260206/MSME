import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from backend.app.core.config import settings
from backend.app.core.errors import AppException
from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.models import *  # Ensure all models are registered
from backend.app.models.customer import Customer
from backend.app.api.api import api_router
from backend.app.services.scheme_eligibility_service import scheme_eligibility_service
from backend.app.core.security import hash_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables on startup if not already created
    Base.metadata.create_all(bind=engine)

    # 2. Non-destructive migration: Ensure password_hash column exists on customers table
    with engine.connect() as conn:
        try:
            info = conn.exec_driver_sql("PRAGMA table_info(customers)").fetchall()
            col_names = [r[1] for r in info]
            if "password_hash" not in col_names:
                conn.exec_driver_sql("ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)")
                conn.commit()
        except Exception:
            pass  # For PostgreSQL or if column already exists

    # 3. Seed verified official government schemes and ensure demo customer credentials
    db = SessionLocal()
    try:
        scheme_eligibility_service.ensure_default_schemes_seeded(db)

        # Set default password for existing demo customers if unhashed
        customers = db.query(Customer).filter(Customer.password_hash == None).all()
        for c in customers:
            c.password_hash = hash_password("Customer@12345")
        if customers:
            db.commit()
    except Exception as e:
        print(f"Startup initialization notice: {e}")
    finally:
        db.close()

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

# Serve built frontend in production if client/dist exists
_dist_candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "client", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client", "dist")),
    os.path.abspath("client/dist"),
    os.path.abspath("dist"),
]

_dist_dir = None
for _p in _dist_candidates:
    if os.path.isdir(_p) and os.path.isfile(os.path.join(_p, "index.html")):
        _dist_dir = _p
        break

if _dist_dir:
    _assets_dir = os.path.join(_dist_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(_dist_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_dist_dir, "index.html"))

