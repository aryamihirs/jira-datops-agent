"""
Minimal FastAPI test for Vercel ASGI support
"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI on Vercel works!"}

@app.get("/api/hello")
def hello():
    return {"status": "ok", "message": "Hello from FastAPI!"}
