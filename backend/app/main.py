import warnings
# Suppress Pydantic V2 protected namespace warnings from Agno/Phidata
warnings.filterwarnings("ignore", message=".*conflict with protected namespace.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*shadows an attribute in parent.*", category=UserWarning)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
import os
import uvicorn
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.ai.tools.tools import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    print("--- STARTING ADMIT AI NEXUS BACKEND ---")
    # Debug: Print all routes
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"Route: {route.path} [{','.join(route.methods)}]")
    scheduler.start()
    yield
    # Shutdown
    print("--- SHUTTING DOWN ---")
    scheduler.shutdown()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://yashsham.github.io",
    "https://admit-ai-backend.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.middleware import MultiTenancyMiddleware, RequestLoggingMiddleware
from app.observability.logging import setup_logging

app.add_middleware(MultiTenancyMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Admit AI Nexus Backend is Running", "docs": "/docs"}

# Static Files (Frontend)
if os.path.exists("../dist"):
    app.mount("/assets", StaticFiles(directory="../dist/assets"), name="assets")
    
    # Catch-all
    from fastapi.responses import FileResponse
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            return {"error": "Not Found"}
            
        file_path = os.path.join("../dist", full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("../dist/index.html")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
