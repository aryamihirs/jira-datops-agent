"""
Vercel serverless function entry point for FastAPI with PostgreSQL
"""
import sys
import os

# Add parent directory to path to import from main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the full app from main.py
from main import app

# Vercel's Python runtime natively supports ASGI apps
# The app is exported and ready for Vercel to handle
