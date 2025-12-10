from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.connection import Connection
from app.services.jira_service import JiraService

router = APIRouter()

class ConnectionCreate(BaseModel):
    name: str
    type: str

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    jira_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None
    jira_project_key: Optional[str] = None
    field_config: Optional[dict] = None

@router.get("")
def get_connections(db: Session = Depends(get_db)):
    connections = db.query(Connection).all()
    return [conn.to_dict() for conn in connections]

@router.post("")
def create_connection(connection: ConnectionCreate, db: Session = Depends(get_db)):
    db_connection = Connection(
        name=connection.name,
        type=connection.type,
        status="inactive"
    )
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    return db_connection.to_dict()

@router.put("/{connection_id}")
def update_connection(connection_id: int, updates: ConnectionUpdate, db: Session = Depends(get_db)):
    db_connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # Update fields
    if updates.name:
        db_connection.name = updates.name
    if updates.jira_url:
        db_connection.jira_url = updates.jira_url
    if updates.jira_email:
        db_connection.jira_email = updates.jira_email
    if updates.jira_api_token:
        db_connection.jira_api_token = updates.jira_api_token
    if updates.jira_project_key:
        db_connection.jira_project_key = updates.jira_project_key
    if updates.field_config is not None:
        db_connection.field_config = updates.field_config
    
    db.commit()
    db.refresh(db_connection)
    return db_connection.to_dict()

@router.post("/{connection_id}/test")
def test_connection(connection_id: int, db: Session = Depends(get_db)):
    """Test JIRA connection."""
    db_connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    if db_connection.type != "jira":
        raise HTTPException(status_code=400, detail="Only JIRA connections can be tested")
    
    if not all([db_connection.jira_url, db_connection.jira_email, db_connection.jira_api_token]):
        raise HTTPException(status_code=400, detail="Missing JIRA credentials")
    
    jira = JiraService(
        db_connection.jira_url,
        db_connection.jira_email,
        db_connection.jira_api_token
    )
    
    result = jira.test_connection()
    
    if result['success']:
        db_connection.status = "active"
        db.commit()
    else:
        db_connection.status = "error"
        db.commit()
    
    return result

@router.get("/{connection_id}/projects")
def get_projects(connection_id: int, db: Session = Depends(get_db)):
    """Get JIRA projects."""
    db_connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    if not all([db_connection.jira_url, db_connection.jira_email, db_connection.jira_api_token]):
        raise HTTPException(status_code=400, detail="Missing JIRA credentials")
    
    jira = JiraService(
        db_connection.jira_url,
        db_connection.jira_email,
        db_connection.jira_api_token
    )
    
    return jira.get_projects()

@router.get("/{connection_id}/field-config")
def get_field_config(connection_id: int, db: Session = Depends(get_db)):
    """Get field configuration for a JIRA project."""
    db_connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    if not all([db_connection.jira_url, db_connection.jira_email, db_connection.jira_api_token, db_connection.jira_project_key]):
        raise HTTPException(status_code=400, detail="Missing JIRA credentials or project key")
    
    jira = JiraService(
        db_connection.jira_url,
        db_connection.jira_email,
        db_connection.jira_api_token
    )
    
    field_config = jira.get_field_configuration(db_connection.jira_project_key)
    
    # Save to database
    db_connection.field_config = field_config
    db.commit()
    
    return field_config

@router.delete("/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    db_connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    db.delete(db_connection)
    db.commit()
    return {"message": "Connection deleted"}
