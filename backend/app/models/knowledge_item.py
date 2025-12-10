from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, unique=True, index=True, nullable=False)  # Unique identifier (filename for docs, ticket key for JIRA)
    item_type = Column(String, nullable=False)  # 'document' or 'jira_ticket'
    title = Column(String, nullable=False)  # Filename or ticket summary

    # Document-specific fields
    file_path = Column(String, nullable=True)  # Path to original file
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String, nullable=True)  # MIME type

    # JIRA ticket-specific fields
    status = Column(String, nullable=True)  # Ticket status
    issue_type = Column(String, nullable=True)  # Issue type

    # Metadata
    chunk_count = Column(Integer, default=0)  # Number of chunks in Pinecone
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        base_dict = {
            "id": self.item_id,
            "title": self.title,
            "file_type": self.item_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "chunk_count": self.chunk_count
        }

        if self.item_type == "document":
            base_dict.update({
                "has_file": True if self.file_path else False,
                "file_size": self.file_size,
                "mime_type": self.mime_type
            })
        elif self.item_type == "jira_ticket":
            base_dict.update({
                "has_file": False,
                "status": self.status,
                "issuetype": self.issue_type
            })

        return base_dict
