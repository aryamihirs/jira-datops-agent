from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'jira', 'email', 'slack', etc.
    status = Column(String, default="inactive")  # 'active', 'inactive', 'error'
    
    # JIRA-specific fields
    jira_url = Column(String, nullable=True)  # e.g., https://yourcompany.atlassian.net
    jira_email = Column(String, nullable=True)
    jira_api_token = Column(String, nullable=True)  # Encrypted in production
    jira_project_key = Column(String, nullable=True)  # e.g., 'PROJ'
    
    # Field configuration (JSON)
    field_config = Column(JSON, nullable=True)  # Stores required/optional fields
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "jira_url": self.jira_url,
            "jira_email": self.jira_email,
            "jira_project_key": self.jira_project_key,
            "field_config": self.field_config,
            "has_api_token": bool(self.jira_api_token),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
