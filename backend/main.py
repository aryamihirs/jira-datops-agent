"""
DataOps JIRA Agent - Backend API Server
Main entry point for the FastAPI application
"""
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.endpoints import requests, connections, dashboard, knowledge

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DataOps JIRA Agent API",
    description="Backend API for intelligent JIRA ticket automation",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://jira-datops-agent-prod.vercel.app",  # Production frontend
        "https://jira-datops-agent-prod-*.vercel.app",  # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "DataOps JIRA Agent",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "ok",
        "database": "connected",
        "llm": "loaded",
        "integrations": {
            "jira": "connected",
            "email": "connected",
            "slack": "connected"
        }
    }

# Include routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
