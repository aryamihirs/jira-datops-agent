from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.request import Request

router = APIRouter()

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total = db.query(Request).count()
    approved = db.query(Request).filter(Request.status == "Approved").count()
    pending = db.query(Request).filter(Request.status == "Under Review").count()
    rejected = db.query(Request).filter(Request.status == "Rejected").count()
    
    return [
        {"id": "total", "label": "Total Requests", "value": total, "change": 0, "trend": "neutral"},
        {"id": "approved", "label": "Approved", "value": approved, "change": 0, "trend": "up"},
        {"id": "pending", "label": "Pending Review", "value": pending, "change": 0, "trend": "neutral"},
        {"id": "rejected", "label": "Rejected", "value": rejected, "change": 0, "trend": "down"},
    ]

@router.get("/activity")
def get_activity(db: Session = Depends(get_db)):
    # Get 5 most recent requests
    recent = db.query(Request).order_by(Request.created_at.desc()).limit(5).all()
    return [
        {
            "id": str(r.id),
            "type": "request_created",
            "description": f"New request: {r.summary}",
            "timestamp": r.created_at.isoformat(),
            "meta": {"status": r.status}
        }
        for r in recent
    ]
