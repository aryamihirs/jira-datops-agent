"""
Docling-based document parsing service.
Provides high-accuracy extraction of tables, text, and structure from PDFs and documents.
"""
from pathlib import Path
from typing import Optional
import tempfile
import os

from docling.document_converter import DocumentConverter


class DoclingParser:
    """
    Production-grade document parser using Docling (IBM Research).
    Achieves 97.9% accuracy on complex table extraction.
    """
    
    def __init__(self):
        self.converter = DocumentConverter()
    
    async def parse_document(self, file_content: bytes, filename: str, mime_type: str) -> str:
        """
        Parse a document using Docling's AI models.
        
        Args:
            file_content: Raw bytes of the file
            filename: Name of the file
            mime_type: MIME type (not used by Docling, but kept for API compatibility)
            
        Returns:
            Structured markdown representation with tables and layout preserved
        """
        
        try:
            # Docling requires a file path, so we create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            
            try:
                # Convert document to structured format
                result = self.converter.convert(tmp_path)
                
                # Export to Markdown (Docling's native output format)
                # This preserves tables, headers, and structure
                markdown_content = result.document.export_to_markdown()
                
                return markdown_content
                
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
        except Exception as e:
            print(f"Docling parsing failed: {e}")
            # Fallback to basic text extraction
            return self._fallback_extraction(file_content, filename)
    
    def _fallback_extraction(self, file_content: bytes, filename: str) -> str:
        """Fallback to basic text extraction if Docling parsing fails."""
        try:
            if filename.endswith(('.txt', '.md')):
                return file_content.decode('utf-8')
            else:
                return f"# {filename}\n\n[Docling parsing unavailable - content stored as binary]"
        except:
            return f"# {filename}\n\n[Content extraction failed]"


# Singleton instance
docling_parser = DoclingParser()
