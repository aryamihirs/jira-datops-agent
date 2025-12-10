"""
Vercel serverless function entry point for FastAPI
Vercel has native ASGI support - importing full app
"""
import sys
import os

# Add parent directory to path to import from main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set environment variable to skip database operations on Vercel
os.environ["VERCEL"] = "1"

try:
    # Try importing the full app from main.py
    from main import app
    print("✓ Successfully imported full app from main.py")
except Exception as e:
    print(f"✗ Failed to import from main.py: {e}")
    print(f"✗ Creating fallback app")

    # Fallback: Create basic app if import fails
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(title="DataOps JIRA Agent API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://jira-datops-agent-prod.vercel.app"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        return {"status": "healthy", "service": "DataOps JIRA Agent", "version": "1.0.0"}

    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "message": "Basic endpoints only - import failed"}

# Vercel's Python runtime natively supports ASGI apps
