import sys
import os

# Get the directory containing this file (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up one level to get the frontend/ directory
frontend_dir = os.path.dirname(current_dir)
# Add backend directory to sys.path
backend_dir = os.path.join(frontend_dir, 'backend')
sys.path.insert(0, backend_dir)

from main import app

# This is the Vercel entry point
# It exposes the FastAPI app instance for Vercel's serverless runtime
