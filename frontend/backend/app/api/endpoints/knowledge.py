from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List
import csv
import io
import os
import shutil
from pathlib import Path
# RAG disabled for Vercel demo
# from app.rag.store import rag_store
rag_store = None  # Placeholder
from app.services.parsing_service import docling_parser

router = APIRouter()

# File storage directory
UPLOAD_DIR = Path("./uploaded_files")
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
async def upload_file(file: UploadFile = File(...)):
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
async def list_knowledge_base():
    """List all files in the knowledge base."""
    documents = rag_store.list_documents()
    tickets = rag_store.list_jira_tickets()
    
    # Consolidate into single list
    all_items = []
    for doc in documents:
        # Check if original file exists
        file_path = UPLOAD_DIR / doc['id']
        all_items.append({
            **doc,
            "file_type": "document",
            "has_file": file_path.exists()
        })
    for ticket in tickets:
        all_items.append({
            **ticket,
            "file_type": "jira_ticket",
            "has_file": False
        })
    
    return {
        "items": all_items,
        "total": len(all_items)
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
async def delete_item(item_type: str, item_id: str):
    """Delete an item from the knowledge base."""
    try:
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
        
        if success:
            return {"message": f"Successfully deleted {item_id}"}
        else:
            raise HTTPException(status_code=404, detail="Item not found or deletion failed")
    except HTTPException:
        raise
    except Exception as e:
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
