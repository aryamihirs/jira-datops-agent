import sys
import os

# Add backend directory to sys.path so that internal imports (like 'from app...') work
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import app

# This is the Vercel entry point
# It exposes the FastAPI app instance for Vercel's serverless runtime
