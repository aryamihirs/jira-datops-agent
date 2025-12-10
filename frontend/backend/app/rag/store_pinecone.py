"""
Pinecone-based RAG store for Vercel deployment.
Uses Pinecone Cloud instead of local ChromaDB.
"""
import os
from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
from llama_index.core import VectorStoreIndex, Document, StorageContext, Settings
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.google import GeminiEmbedding
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core.retrievers import VectorIndexRetriever


class PineconeRAGStore:
    """
    Production RAG store using Pinecone Cloud.
    Optimized for Vercel serverless deployment.
    """

    def __init__(self):
        # Initialize Pinecone
        api_key = os.getenv("PINECONE_API_KEY")

        if not api_key:
            print("WARNING: PINECONE_API_KEY not found. RAG will not work.")
            self.pc = None
            return

        self.pc = Pinecone(api_key=api_key)

        # Set up Gemini embeddings
        gemini_api_key = os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            print("WARNING: GOOGLE_API_KEY not found. Embeddings will not work.")
        Settings.embed_model = GeminiEmbedding(
            model_name="models/embedding-001",
            api_key=gemini_api_key
        )

        # Index names
        self.jira_index_name = "jira-history"
        self.docs_index_name = "architecture-docs"

        # Create indexes if they don't exist
        self._ensure_indexes()

        # Get Pinecone indexes
        self.jira_index = self.pc.Index(self.jira_index_name)
        self.docs_index = self.pc.Index(self.docs_index_name)

        # Create vector stores
        self.jira_vector_store = PineconeVectorStore(pinecone_index=self.jira_index)
        self.docs_vector_store = PineconeVectorStore(pinecone_index=self.docs_index)

        # Create storage contexts
        self.jira_storage_context = StorageContext.from_defaults(
            vector_store=self.jira_vector_store
        )
        self.docs_storage_context = StorageContext.from_defaults(
            vector_store=self.docs_vector_store
        )

        # Initialize LlamaIndex indexes
        self.jira_llama_index = VectorStoreIndex.from_vector_store(
            self.jira_vector_store,
            storage_context=self.jira_storage_context
        )
        self.docs_llama_index = VectorStoreIndex.from_vector_store(
            self.docs_vector_store,
            storage_context=self.docs_storage_context
        )

        # Markdown parser for semantic chunking
        self.node_parser = MarkdownNodeParser()

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
                    dimension=768,  # Gemini embedding dimension
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
                    dimension=768,  # Gemini embedding dimension
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                print(f"Created Pinecone index: {self.docs_index_name}")
            except Exception as e:
                print(f"Error creating docs index: {e}")

    def add_jira_tickets(self, tickets: List[Dict[str, Any]]):
        """Ingest JIRA tickets into vector store."""
        if not self.pc:
            print("Pinecone not initialized. Skipping ticket ingestion.")
            return

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
            self.jira_llama_index.insert(doc)

    def add_documents(self, docs: List[Dict[str, str]]):
        """Ingest documents with semantic chunking."""
        if not self.pc:
            print("Pinecone not initialized. Skipping document ingestion.")
            return

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
        self.docs_llama_index.insert_nodes(nodes)

    def query_similar_tickets(self, query: str, n_results: int = 3) -> Dict[str, Any]:
        """Retrieve similar past tickets using vector search."""
        if not self.pc:
            return {'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]}

        retriever = VectorIndexRetriever(
            index=self.jira_llama_index,
            similarity_top_k=n_results
        )

        nodes = retriever.retrieve(query)

        # Format results to match original API
        results = {
            'ids': [[node.node_id for node in nodes]],
            'documents': [[node.text for node in nodes]],
            'metadatas': [[node.metadata for node in nodes]],
            'distances': [[1.0 - node.score for node in nodes]]
        }
        return results

    def query_docs(self, query: str, n_results: int = 5) -> List[str]:
        """Retrieve relevant documentation with re-ranking."""
        if not self.pc:
            return []

        retriever = VectorIndexRetriever(
            index=self.docs_llama_index,
            similarity_top_k=min(20, n_results * 4)
        )

        nodes = retriever.retrieve(query)

        # Return top n_results
        return [node.text for node in nodes[:n_results]]

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
        if not self.pc:
            return False

        try:
            self.docs_index.delete(ids=[doc_id])
            return True
        except Exception as e:
            print(f"Error deleting document {doc_id}: {e}")
            return False

    def delete_jira_ticket(self, ticket_id: str) -> bool:
        """Delete a JIRA ticket from the vector store."""
        if not self.pc:
            return False

        try:
            self.jira_index.delete(ids=[ticket_id])
            return True
        except Exception as e:
            print(f"Error deleting ticket {ticket_id}: {e}")
            return False


# Singleton instance
try:
    rag_store = PineconeRAGStore()
    print("✅ Pinecone RAG store initialized successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not initialize Pinecone RAG store: {e}")
    rag_store = None
