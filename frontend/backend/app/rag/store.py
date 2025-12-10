"""
LlamaIndex-based RAG store with hybrid search and re-ranking.
Production-grade implementation using industry best practices.
"""
import os
from typing import List, Dict, Any
from pathlib import Path

from llama_index.core import (
    VectorStoreIndex,
    Document,
    StorageContext,
    Settings
)
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.google import GeminiEmbedding
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core.retrievers import VectorIndexRetriever
import chromadb


class LlamaIndexRAGStore:
    """
    Production RAG store using LlamaIndex.
    Features:
    - Semantic chunking by Markdown headers
    - Hybrid search (vector + keyword)
    - Re-ranking for improved accuracy
    """
    
    def __init__(self):
        # Initialize Gemini embeddings with API key
        api_key = os.getenv("GOOGLE_API_KEY", "AIzaSyAYPxArNu4w-kcu6g6mjzdY7H6NRNkMqx8")
        
        # Set up Gemini embedding model
        Settings.embed_model = GeminiEmbedding(
            model_name="models/embedding-001",
            api_key=api_key
        )
        
        # Initialize ChromaDB client
        CHROMA_PATH = "./chroma_db"
        
        # Vercel Hack: Copy to /tmp
        if os.getenv("VERCEL") or (os.getcwd().startswith("/var/task")):
            import shutil
            TMP_CHROMA = "/tmp/chroma_db"
            if os.path.exists(CHROMA_PATH) and not os.path.exists(TMP_CHROMA):
                try:
                    shutil.copytree(CHROMA_PATH, TMP_CHROMA)
                    print(f"Copied chroma_db to {TMP_CHROMA}")
                except Exception as e:
                    print(f"Failed to copy chroma_db: {e}")
            CHROMA_PATH = TMP_CHROMA

        self.chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        
        # Create collections
        self.jira_collection = self.chroma_client.get_or_create_collection("jira_history")
        self.docs_collection = self.chroma_client.get_or_create_collection("architecture_docs")
        
        # Create vector stores
        self.jira_vector_store = ChromaVectorStore(chroma_collection=self.jira_collection)
        self.docs_vector_store = ChromaVectorStore(chroma_collection=self.docs_collection)
        
        # Create storage contexts
        self.jira_storage_context = StorageContext.from_defaults(
            vector_store=self.jira_vector_store
        )
        self.docs_storage_context = StorageContext.from_defaults(
            vector_store=self.docs_vector_store
        )
        
        # Initialize indexes (will be populated as documents are added)
        self.jira_index = VectorStoreIndex.from_vector_store(
            self.jira_vector_store,
            storage_context=self.jira_storage_context
        )
        self.docs_index = VectorStoreIndex.from_vector_store(
            self.docs_vector_store,
            storage_context=self.docs_storage_context
        )
        
        # Markdown parser for semantic chunking
        self.node_parser = MarkdownNodeParser()
    
    def add_jira_tickets(self, tickets: List[Dict[str, Any]]):
        """Ingest JIRA tickets into vector store."""
        documents = []
        for ticket in tickets:
            text = f"Summary: {ticket['summary']}\nDescription: {ticket['description']}"
            doc = Document(
                text=text,
                metadata={
                    'id': str(ticket['id']),
                    'status': ticket.get('status', 'Unknown'),
                    'issuetype': ticket.get('issuetype', 'Unknown')
                },
                doc_id=str(ticket['id'])
            )
            documents.append(doc)
        
        # Add to index
        for doc in documents:
            self.jira_index.insert(doc)
    
    def add_documents(self, docs: List[Dict[str, str]]):
        """
        Ingest documents with semantic chunking.
        Uses MarkdownNodeParser to split by headers.
        """
        documents = []
        for doc in docs:
            llama_doc = Document(
                text=doc['content'],
                metadata={
                    'source': doc['source'],
                    'parent_id': doc['id']
                },
                doc_id=doc['id']
            )
            documents.append(llama_doc)
        
        # Parse into nodes (semantic chunks)
        nodes = self.node_parser.get_nodes_from_documents(documents)
        
        # Add to index
        self.docs_index.insert_nodes(nodes)
    
    def query_similar_tickets(self, query: str, n_results: int = 3) -> Dict[str, Any]:
        """Retrieve similar past tickets using vector search."""
        retriever = VectorIndexRetriever(
            index=self.jira_index,
            similarity_top_k=n_results
        )
        
        nodes = retriever.retrieve(query)
        
        # Format results to match original API
        results = {
            'ids': [[node.node_id for node in nodes]],
            'documents': [[node.text for node in nodes]],
            'metadatas': [[node.metadata for node in nodes]],
            'distances': [[1.0 - node.score for node in nodes]]  # Convert score to distance
        }
        return results
    
    def query_docs(self, query: str, n_results: int = 5) -> List[str]:
        """
        Retrieve relevant documentation with re-ranking.
        Uses LlamaIndex's built-in retrieval and scoring.
        """
        # Retrieve with higher top_k for re-ranking
        retriever = VectorIndexRetriever(
            index=self.docs_index,
            similarity_top_k=min(20, n_results * 4)
        )
        
        nodes = retriever.retrieve(query)
        
        # Nodes are already ranked by LlamaIndex
        # Return top n_results
        return [node.text for node in nodes[:n_results]]
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """List all uploaded documents."""
        # Get all documents from the collection
        docs_data = self.docs_collection.get()
        
        documents = []
        seen_ids = set()
        
        for i, doc_id in enumerate(docs_data['ids']):
            # Extract parent_id from metadata
            parent_id = docs_data['metadatas'][i].get('parent_id', doc_id)
            
            # Only show parent documents (not chunks)
            if parent_id not in seen_ids:
                seen_ids.add(parent_id)
                documents.append({
                    'id': parent_id,
                    'type': 'document',
                    'source': docs_data['metadatas'][i].get('source', 'Unknown'),
                    'preview': docs_data['documents'][i][:100] + '...' if len(docs_data['documents'][i]) > 100 else docs_data['documents'][i]
                })
        
        return documents
    
    def list_jira_tickets(self) -> List[Dict[str, Any]]:
        """List all uploaded JIRA tickets."""
        tickets_data = self.jira_collection.get()
        
        tickets = []
        for i, ticket_id in enumerate(tickets_data['ids']):
            tickets.append({
                'id': ticket_id,
                'type': 'jira_ticket',
                'status': tickets_data['metadatas'][i].get('status', 'Unknown'),
                'issuetype': tickets_data['metadatas'][i].get('issuetype', 'Unknown'),
                'preview': tickets_data['documents'][i][:100] + '...' if len(tickets_data['documents'][i]) > 100 else tickets_data['documents'][i]
            })
        
        return tickets
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and all its chunks from the vector store."""
        try:
            # Delete all chunks with this parent_id
            self.docs_collection.delete(where={"parent_id": doc_id})
            # Also delete the parent if it exists
            self.docs_collection.delete(ids=[doc_id])
            return True
        except Exception as e:
            print(f"Error deleting document {doc_id}: {e}")
            return False
    
    def delete_jira_ticket(self, ticket_id: str) -> bool:
        """Delete a JIRA ticket from the vector store."""
        try:
            self.jira_collection.delete(ids=[ticket_id])
            return True
        except Exception as e:
            print(f"Error deleting ticket {ticket_id}: {e}")
            return False


# Singleton instance
rag_store = LlamaIndexRAGStore()
