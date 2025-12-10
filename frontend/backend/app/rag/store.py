"""
RAG store - Now uses Pinecone for Vercel deployment.
Imports from store_pinecone for cloud-based vector storage.
"""
# Import Pinecone-based RAG store for Vercel deployment
from app.rag.store_pinecone import rag_store

# Re-export for backward compatibility
__all__ = ['rag_store']
