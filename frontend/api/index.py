import sys
import os

# Get the directory containing this file (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up one level to get the frontend/ directory
frontend_dir = os.path.dirname(current_dir)
# Add backend directory to sys.path
backend_dir = os.path.join(frontend_dir, 'backend')
sys.path.insert(0, backend_dir)

# Import FastAPI app
from main import app

# Vercel Python runtime expects a handler function
# For FastAPI/ASGI apps, we can use Mangum adapter
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    # Fallback: just expose the app directly (works with some ASGI servers)
    handler = app
