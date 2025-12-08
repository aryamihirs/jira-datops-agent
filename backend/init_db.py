"""
Initialize database tables
"""
from app.database import engine, Base
from app.models.connection import Connection
from app.models.request import Request

# Create all tables
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
