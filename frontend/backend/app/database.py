from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

import shutil

# Use SQLite for development, can be switched to Postgres via env var
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Vercel Serverless Hack: Copy DB to /tmp to make it writable
# (Only works for demo/ephemeral data)
if os.getenv("VERCEL") or (os.getcwd().startswith("/var/task")):
    DB_FILE = "sql_app.db"
    TMP_DB = f"/tmp/{DB_FILE}"
    if os.path.exists(DB_FILE):
        if not os.path.exists(TMP_DB):
            try:
                shutil.copy2(DB_FILE, TMP_DB)
                print(f"Copied {DB_FILE} to {TMP_DB} for writable access")
            except Exception as e:
                print(f"Failed to copy DB to tmp: {e}")
    
    # Update URL to point to tmp
    # Note: sqlite:/// with absolute path needs 4 slashes? No, 3 for relative, 4 for absolute on unix? 
    # Actually SQLAlchemy: sqlite:////tmp/sql_app.db
    DATABASE_URL = f"sqlite:///{TMP_DB}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
