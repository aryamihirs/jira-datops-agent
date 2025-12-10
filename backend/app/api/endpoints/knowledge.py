from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import os
import shutil
from pathlib import Path
# RAG with Pinecone for production
from app.rag.store import rag_store
from app.services.parsing_service import docling_parser
from app.database import get_db
from app.models.knowledge_item import KnowledgeItem

router = APIRouter()

# File storage directory
# Use /tmp for Vercel serverless (ephemeral storage)
UPLOAD_DIR = Path("/tmp/uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

def get_mime_type(filename: str) -> str:
    """Determine MIME type from filename."""
    ext = filename.lower().split('.')[-1]
    mime_types = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'csv': 'text/csv',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
    }
    return mime_types.get(ext, 'application/octet-stream')

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Universal file upload endpoint with Gemini-powered parsing."""
    try:
        content = await file.read()
        
        # Save original file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Check if it's a JIRA CSV based on headers
        if file.filename.endswith('.csv'):
            try:
                decoded_content = content.decode('utf-8')
                csv_reader = csv.DictReader(io.StringIO(decoded_content))
                first_row = next(csv_reader, None)
                
                # Check if it looks like JIRA export
                if first_row and any(key in first_row for key in ['Issue key', 'Key', 'Summary']):
                    # Process as JIRA CSV
                    csv_reader = csv.DictReader(io.StringIO(decoded_content))
                    tickets = []
                    for row in csv_reader:
                        ticket = {
                            "id": row.get('Issue key', row.get('Key', f"CSV-{len(tickets)}")),
                            "summary": row.get('Summary', ''),
                            "description": row.get('Description', ''),
                            "status": row.get('Status', 'Unknown'),
                            "issuetype": row.get('Issue Type', 'Unknown')
                        }
                        if ticket['id']:
                            tickets.append(ticket)
                    
                    if tickets:
                        rag_store.add_jira_tickets(tickets)

                        # Save each ticket to database
                        for ticket in tickets:
                            knowledge_item = KnowledgeItem(
                                item_id=ticket['id'],
                                item_type="jira_ticket",
                                title=ticket['summary'],
                                status=ticket.get('status', 'Unknown'),
                                issue_type=ticket.get('issuetype', 'Unknown'),
                                chunk_count=1
                            )
                            db.merge(knowledge_item)  # Use merge to handle duplicates
                        db.commit()

                        return {
                            "message": f"Successfully uploaded {file.filename} as JIRA history",
                            "type": "jira_csv",
                            "count": len(tickets)
                        }
            except:
                pass  # If not JIRA CSV, treat as document
        
        # Process as document using Docling parser
        mime_type = get_mime_type(file.filename)
        
        try:
            # Use Docling for advanced parsing (97.9% table accuracy)
            text_content = await docling_parser.parse_document(content, file.filename, mime_type)
        except Exception as e:
            print(f"Docling parsing failed, using fallback: {e}")
            # Fallback to basic extraction for text files
            if file.filename.endswith(('.txt', '.md')):
                text_content = content.decode('utf-8')
            else:
                text_content = f"# {file.filename}\n\n[Advanced parsing unavailable - content stored as binary]"
        
        doc = {
            "id": file.filename,
            "content": text_content,
            "source": file.filename
        }

        rag_store.add_documents([doc])

        # Calculate chunk count (simple chunking by paragraphs)
        chunks = [chunk.strip() for chunk in text_content.split('\n\n') if chunk.strip()]

        # Save document metadata to database
        knowledge_item = KnowledgeItem(
            item_id=file.filename,
            item_type="document",
            title=file.filename,
            file_path=str(file_path),
            file_size=len(content),
            mime_type=mime_type,
            chunk_count=len(chunks)
        )
        db.merge(knowledge_item)  # Use merge to handle duplicates
        db.commit()

        return {
            "message": f"Successfully uploaded {file.filename}",
            "type": "document",
            "size": len(text_content)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/list")
async def list_knowledge_base(db: Session = Depends(get_db)):
    """List all files in the knowledge base."""
    # Query all knowledge items from database
    items = db.query(KnowledgeItem).order_by(KnowledgeItem.created_at.desc()).all()

    return {
        "items": [item.to_dict() for item in items],
        "total": len(items)
    }

@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download/view original file."""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
    media_type = "application/octet-stream"
    if filename.endswith('.pdf'):
        media_type = "application/pdf"
    elif filename.endswith('.docx'):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith('.pptx'):
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    elif filename.endswith('.txt'):
        media_type = "text/plain"
    elif filename.endswith('.md'):
        media_type = "text/markdown"
    elif filename.endswith('.csv'):
        media_type = "text/csv"
    
    # Set Content-Disposition to inline for browser viewing
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"'
    }
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers
    )

@router.delete("/item/{item_type}/{item_id}")
async def delete_item(item_type: str, item_id: str, db: Session = Depends(get_db)):
    """Delete an item from the knowledge base."""
    try:
        # Delete from database
        knowledge_item = db.query(KnowledgeItem).filter(
            KnowledgeItem.item_id == item_id,
            KnowledgeItem.item_type == item_type
        ).first()

        if not knowledge_item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Delete from Pinecone
        if item_type == "document":
            success = rag_store.delete_document(item_id)
            # Also delete the original file if it exists
            file_path = UPLOAD_DIR / item_id
            if file_path.exists():
                file_path.unlink()
        elif item_type == "jira_ticket":
            success = rag_store.delete_jira_ticket(item_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid item type")

        # Delete from database
        db.delete(knowledge_item)
        db.commit()

        return {"message": f"Successfully deleted {item_id}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

@router.get("/item/{item_type}/{item_id}/content")
async def get_item_content(item_type: str, item_id: str):
    """Get full content of an item from the knowledge base."""
    try:
        if item_type == "document":
            docs_data = rag_store.docs_collection.get(ids=[item_id])
            if not docs_data['ids']:
                raise HTTPException(status_code=404, detail="Document not found")
            return {
                "id": item_id,
                "type": "document",
                "source": docs_data['metadatas'][0].get('source', 'Unknown'),
                "content": docs_data['documents'][0]
            }
        elif item_type == "jira_ticket":
            tickets_data = rag_store.jira_collection.get(ids=[item_id])
            if not tickets_data['ids']:
                raise HTTPException(status_code=404, detail="Ticket not found")
            return {
                "id": item_id,
                "type": "jira_ticket",
                "status": tickets_data['metadatas'][0].get('status', 'Unknown'),
                "issuetype": tickets_data['metadatas'][0].get('issuetype', 'Unknown'),
                "content": tickets_data['documents'][0]
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid item type")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve content: {str(e)}")
