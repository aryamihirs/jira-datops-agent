"""
DataOps JIRA Agent - Backend API Server
Main entry point for the FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DataOps JIRA Agent API",
    description="Backend API for intelligent JIRA ticket automation",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # NextJS dev server
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
        "database": "connected",  # TODO: Check actual DB connection
        "llm": "loaded",  # TODO: Check LLM status
        "integrations": {
            "jira": "connected",  # TODO: Check actual status
            "email": "connected",
            "slack": "connected"
        }
    }


# TODO: Import and include routers
# from app.api import dashboard, requests, connections, patterns
# app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
# app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
# app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
# app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
