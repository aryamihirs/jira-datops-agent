"""
Vercel serverless function entry point for FastAPI
"""
import sys
import os

# Add parent directory to path to import from main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Vercel expects the app to be exported for serverless deployment
# The Vercel Python runtime will handle ASGI automatically
