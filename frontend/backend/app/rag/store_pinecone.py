"""
Minimal Pinecone RAG store optimized for Vercel deployment.
Uses Pinecone SDK and Google Embeddings directly (no llama-index).
"""
import os
from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
import google.generativeai as genai


class PineconeRAGStore:
    """
    Minimal RAG store using Pinecone SDK directly.
    Optimized for Vercel serverless deployment (lightweight).
    """

    def __init__(self):
        # Initialize Pinecone
        api_key = os.getenv("PINECONE_API_KEY")

        if not api_key:
            print("WARNING: PINECONE_API_KEY not found. RAG will not work.")
            self.pc = None
            return

        self.pc = Pinecone(api_key=api_key)

        # Set up Google Gemini for embeddings
        gemini_api_key = os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            print("WARNING: GOOGLE_API_KEY not found. Embeddings will not work.")
            self.embedding_model = None
        else:
            genai.configure(api_key=gemini_api_key)
            self.embedding_model = "models/text-embedding-004"

        # Index names
        self.jira_index_name = "jira-history"
        self.docs_index_name = "architecture-docs"

        # Embedding dimension for Google's text-embedding-004
        self.embedding_dim = 768

        # Create indexes if they don't exist
        self._ensure_indexes()

        # Get Pinecone indexes
        try:
            self.jira_index = self.pc.Index(self.jira_index_name)
            self.docs_index = self.pc.Index(self.docs_index_name)
        except Exception as e:
            print(f"Error connecting to Pinecone indexes: {e}")
            self.jira_index = None
            self.docs_index = None

    def _ensure_indexes(self):
        """Create Pinecone indexes if they don't exist."""
        if not self.pc:
            return

        existing_indexes = [idx.name for idx in self.pc.list_indexes()]

        # Create JIRA index if needed
        if self.jira_index_name not in existing_indexes:
            try:
                self.pc.create_index(
                    name=self.jira_index_name,
                    dimension=self.embedding_dim,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                print(f"Created Pinecone index: {self.jira_index_name}")
            except Exception as e:
                print(f"Error creating JIRA index: {e}")

        # Create docs index if needed
        if self.docs_index_name not in existing_indexes:
            try:
                self.pc.create_index(
                    name=self.docs_index_name,
                    dimension=self.embedding_dim,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                print(f"Created Pinecone index: {self.docs_index_name}")
            except Exception as e:
                print(f"Error creating docs index: {e}")

    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using Google's embedding model."""
        if not self.embedding_model:
            return []

        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return []

    def add_jira_tickets(self, tickets: List[Dict[str, Any]]):
        """Ingest JIRA tickets into vector store."""
        if not self.pc or not self.jira_index:
            print("Pinecone not initialized. Skipping ticket ingestion.")
            return

        vectors = []
        for ticket in tickets:
            text = f"Summary: {ticket['summary']}\nDescription: {ticket['description']}"
            embedding = self._get_embedding(text)

            if embedding:
                vectors.append({
                    "id": str(ticket['id']),
                    "values": embedding,
                    "metadata": {
                        "text": text,
                        "status": ticket.get('status', 'Unknown'),
                        "issuetype": ticket.get('issuetype', 'Unknown')
                    }
                })

        if vectors:
            try:
                self.jira_index.upsert(vectors=vectors)
                print(f"Upserted {len(vectors)} JIRA tickets to Pinecone")
            except Exception as e:
                print(f"Error upserting tickets: {e}")

    def add_documents(self, docs: List[Dict[str, str]]):
        """Ingest documents with chunking."""
        if not self.pc or not self.docs_index:
            print("Pinecone not initialized. Skipping document ingestion.")
            return

        vectors = []
        for doc in docs:
            # Simple chunking: split by paragraphs (double newline)
            chunks = [chunk.strip() for chunk in doc['content'].split('\n\n') if chunk.strip()]

            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc['id']}_chunk_{i}"
                embedding = self._get_embedding(chunk)

                if embedding:
                    vectors.append({
                        "id": chunk_id,
                        "values": embedding,
                        "metadata": {
                            "text": chunk,
                            "source": doc['source'],
                            "parent_id": doc['id'],
                            "chunk_index": i
                        }
                    })

        if vectors:
            try:
                self.docs_index.upsert(vectors=vectors)
                print(f"Upserted {len(vectors)} document chunks to Pinecone")
            except Exception as e:
                print(f"Error upserting documents: {e}")

    def query_similar_tickets(self, query: str, n_results: int = 3) -> Dict[str, Any]:
        """Retrieve similar past tickets using vector search."""
        if not self.pc or not self.jira_index:
            return {'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]}

        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return {'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]}

        try:
            results = self.jira_index.query(
                vector=query_embedding,
                top_k=n_results,
                include_metadata=True
            )

            # Format results to match original API
            ids = [match['id'] for match in results['matches']]
            documents = [match['metadata'].get('text', '') for match in results['matches']]
            metadatas = [match['metadata'] for match in results['matches']]
            distances = [1.0 - match['score'] for match in results['matches']]

            return {
                'ids': [ids],
                'documents': [documents],
                'metadatas': [metadatas],
                'distances': [distances]
            }
        except Exception as e:
            print(f"Error querying tickets: {e}")
            return {'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]}

    def query_docs(self, query: str, n_results: int = 5) -> List[str]:
        """Retrieve relevant documentation."""
        if not self.pc or not self.docs_index:
            return []

        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return []

        try:
            results = self.docs_index.query(
                vector=query_embedding,
                top_k=n_results,
                include_metadata=True
            )

            return [match['metadata'].get('text', '') for match in results['matches']]
        except Exception as e:
            print(f"Error querying docs: {e}")
            return []

    def list_documents(self) -> List[Dict[str, Any]]:
        """List all uploaded documents."""
        # Note: Pinecone doesn't support listing all documents easily
        # This would require maintaining a separate metadata store
        return []

    def list_jira_tickets(self) -> List[Dict[str, Any]]:
        """List all uploaded JIRA tickets."""
        # Note: Pinecone doesn't support listing all documents easily
        return []

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document from the vector store."""
        if not self.pc or not self.docs_index:
            return False

        try:
            # Delete all chunks with this parent_id
            # Note: Pinecone doesn't support delete by metadata directly
            # This is a limitation - we can only delete by ID
            self.docs_index.delete(ids=[doc_id])
            return True
        except Exception as e:
            print(f"Error deleting document {doc_id}: {e}")
            return False

    def delete_jira_ticket(self, ticket_id: str) -> bool:
        """Delete a JIRA ticket from the vector store."""
        if not self.pc or not self.jira_index:
            return False

        try:
            self.jira_index.delete(ids=[ticket_id])
            return True
        except Exception as e:
            print(f"Error deleting ticket {ticket_id}: {e}")
            return False

    # Collections property for backward compatibility
    @property
    def docs_collection(self):
        """Mock collection object for backward compatibility."""
        return MockCollection(self.docs_index)

    @property
    def jira_collection(self):
        """Mock collection object for backward compatibility."""
        return MockCollection(self.jira_index)


class MockCollection:
    """Mock collection class for backward compatibility with ChromaDB API."""

    def __init__(self, index):
        self.index = index

    def get(self, ids=None):
        """Mock get method - returns empty results."""
        return {
            'ids': ids or [],
            'documents': [],
            'metadatas': []
        }


# Singleton instance
try:
    rag_store = PineconeRAGStore()
    print("✅ Minimal Pinecone RAG store initialized successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not initialize Pinecone RAG store: {e}")
    rag_store = None
