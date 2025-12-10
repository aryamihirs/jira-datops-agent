"""
Vercel serverless function entry point for FastAPI
"""
import sys
import os

# Add parent directory to path to import from main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from mangum import Mangum

# Vercel expects the app to be exported for serverless deployment
# Using Mangum to wrap FastAPI for AWS Lambda/Vercel compatibility
handler = Mangum(app, lifespan="off")
