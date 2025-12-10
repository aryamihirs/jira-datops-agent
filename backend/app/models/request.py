from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core Fields
    summary = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default="Under Review")  # Under Review, Approved, Rejected
    
    # Metadata
    source_tag = Column(String)  # email, teams, manual
    source_content = Column(JSON)  # Original artifacts/text
    
    # JIRA Fields
    acceptance_criteria = Column(Text, nullable=True)
    requestor = Column(String, nullable=True)
    assignee = Column(String, nullable=True)
    business_unit = Column(String, nullable=True)
    tags = Column(JSON, default=list)  # List of strings
    jira_issue_key = Column(String, nullable=True) # e.g. PROJ-123
    released_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "summary": self.summary,
            "description": self.description,
            "status": self.status,
            "source_tag": self.source_tag,
            "source_content": self.source_content,
            "acceptance_criteria": self.acceptance_criteria,
            "requestor": self.requestor,
            "assignee": self.assignee,
            "business_unit": self.business_unit,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
