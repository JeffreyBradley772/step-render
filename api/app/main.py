from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, upload, files
from app.database import sessionmanager

# constants
PREFIX = "/api/v1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # create database tables
    await sessionmanager.create_all()
    
    yield
    
    # cleanup on shutdown
    await sessionmanager.close()

def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan, title="Step Render API", version="0.0.1")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(health.router, prefix=PREFIX)
    app.include_router(upload.router, prefix=PREFIX)
    app.include_router(files.router, prefix=PREFIX)
    
    return app

app = create_app()
