"""
Vercel serverless function entry point for FastAPI
Vercel has native ASGI support - testing imports incrementally
"""
import sys
import os

# Add parent directory to path to import from main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create a simple app first
app = FastAPI(title="DataOps JIRA Agent API")

# Add CORS
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
    return {"status": "ok", "message": "FastAPI works on Vercel!"}

# Vercel's Python runtime natively supports ASGI apps
# Just export the FastAPI app directly
