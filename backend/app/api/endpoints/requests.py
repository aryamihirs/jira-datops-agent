from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.request import Request
from pydantic import BaseModel

router = APIRouter()

class RequestCreate(BaseModel):
    summary: Optional[str] = None
    description: str
    source_tag: str
    source_content: Optional[dict] = None

class RequestUpdate(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    requestor: Optional[str] = None
    assignee: Optional[str] = None
    business_unit: Optional[str] = None
    tags: Optional[List[str]] = None

@router.get("/", response_model=List[dict])
def get_requests(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Request)
    if status:
        query = query.filter(Request.status == status)
    return [r.to_dict() for r in query.all()]

@router.post("/", response_model=dict)
async def create_request(request: RequestCreate, db: Session = Depends(get_db)):
    print(f"DEBUG: create_request called with: {request}")
    # Handle raw request creation (simulating AI agent)
    summary = request.summary
    description = request.description
    status = "Under Review"
    
    if not summary:
        from app.services.ai_service import ai_service
        # Trigger AI agent to extract summary from description/files
        extracted_data = await ai_service.extract_request_details(request.description)
        summary = extracted_data.get("summary", "New Request (Processing)")
        # Optionally update description or other fields based on AI output
        # description = extracted_data.get("description", description)
    
    db_request = Request(
        summary=summary,
        description=description,
        source_tag=request.source_tag,
        source_content=request.source_content,
        status=status
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request.to_dict()

@router.get("/{request_id}", response_model=dict)
def get_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(Request).filter(Request.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return db_request.to_dict()

@router.patch("/{request_id}", response_model=dict)
def update_request(request_id: int, request: RequestUpdate, db: Session = Depends(get_db)):
    db_request = db.query(Request).filter(Request.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_request, key, value)
    
    db.commit()
    db.refresh(db_request)
    return db_request.to_dict()

@router.post("/{request_id}/approve", response_model=dict)
def approve_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(Request).filter(Request.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db_request.status = "Approved"
    db.commit()
    return db_request.to_dict()

@router.post("/{request_id}/reject", response_model=dict)
def reject_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(Request).filter(Request.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db_request.status = "Rejected"
    db.commit()
    return db_request.to_dict()

@router.get("/export/csv")
def export_requests_csv(db: Session = Depends(get_db)):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    requests = db.query(Request).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', 'Summary', 'Status', 'Source', 'Requestor', 'Created At', 'Description'])
    
    # Write data
    for r in requests:
        writer.writerow([
            r.id,
            r.summary,
            r.status,
            r.source_tag,
            r.requestor or '',
            r.created_at,
            r.description or ''
        ])
    
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=requests_export.csv"
    return response

class AnalyzeRequest(BaseModel):
    description: str
    files: Optional[List[str]] = None
    jira_schema: Optional[dict] = None

@router.post("/analyze", response_model=dict)
async def analyze_request(request: AnalyzeRequest):
    """
    Analyze request context and extract structured data for JIRA.
    """
    from app.services.ai_service import ai_service
    extracted_data = await ai_service.extract_request_details(request.description, request.files, request.jira_schema)
    return extracted_data

class ReleaseRequest(BaseModel):
    request_ids: List[int]

@router.post("/release", response_model=dict)
def release_to_jira(payload: ReleaseRequest, db: Session = Depends(get_db)):
    from app.models.connection import Connection
    from app.services.jira_service import JiraService
    from datetime import datetime

    # 1. Get Active JIRA Connection
    jira_conn = db.query(Connection).filter(
        Connection.type == 'jira',
        Connection.status == 'active'
    ).first()

    if not jira_conn:
        raise HTTPException(status_code=400, detail="No active JIRA connection found. Please configure one in Settings.")

    if not jira_conn.jira_api_token:
        raise HTTPException(status_code=400, detail="JIRA API token is missing in connection.")

    jira_service = JiraService(jira_conn.jira_url, jira_conn.jira_email, jira_conn.jira_api_token)
    project_key = jira_conn.jira_project_key
    
    if not project_key:
         raise HTTPException(status_code=400, detail="JIRA Project Key is missing in connection.")

    results = {
        "total": len(payload.request_ids),
        "success": 0,
        "failed": 0,
        "skipped": 0, # Already released or not approved
        "details": []
    }

    for req_id in payload.request_ids:
        request = db.query(Request).filter(Request.id == req_id).first()
        
        if not request:
            results["failed"] += 1
            results["details"].append({"id": req_id, "status": "failed", "error": "Request not found"})
            continue
            
        if request.jira_issue_key:
             results["skipped"] += 1
             results["details"].append({"id": req_id, "status": "skipped", "reason": "Already released"})
             continue
        
        if request.status != "Approved":
             results["skipped"] += 1
             results["details"].append({"id": req_id, "status": "skipped", "reason": "Request not approved"})
             continue

        # Prepare Issue Data
        issue_data = {
            "summary": request.summary,
            "description": request.description,
            # Add other defaults if needed
        }
        
        # Merge Dynamic Fields from source_content if available
        if request.source_content and isinstance(request.source_content, dict):
            # Try to get jira_fields
            jira_fields = request.source_content.get("jira_fields", {})
            issue_type = request.source_content.get("issue_type")
            
            # Use specific issue type if selected, otherwise let JIRA default or use what's in fields
            if issue_type:
                issue_data["issuetype"] = {"name": issue_type}
            
            # Map dynamic fields (simple mapping for now, assuming keys match JIRA field keys)
            # CAUTION: Docling/AI might give human readable keys, but previous fix ensures schema keys?
            # Assuming AI output keys match JIRA keys as per previous fix request.
            for key, value in jira_fields.items():
                if key not in ["summary", "description", "issuetype", "project"]:
                     issue_data[key] = value

        # Create Issue
        result = jira_service.create_issue(project_key, issue_data)
        
        if result["success"]:
            request.jira_issue_key = result["issue"]["key"]
            request.released_at = datetime.utcnow()
            request.status = "Released"
            db.commit()
            
            results["success"] += 1
            results["details"].append({
                "id": req_id, 
                "status": "success", 
                "jira_key": result["issue"]["key"],
                "jira_link": f"{jira_conn.jira_url}/browse/{result['issue']['key']}"
            })
        else:
            results["failed"] += 1
            results["details"].append({"id": req_id, "status": "failed", "error": result.get("error")})

    return results
