import os
from typing import List
from google import genai
from google.genai import types

class GoogleEmbeddings:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY", "AIzaSyAYPxArNu4w-kcu6g6mjzdY7H6NRNkMqx8")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        self.client = genai.Client(api_key=self.api_key)
        self.model = "text-embedding-004"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents."""
        try:
            # Batch embedding if supported, or loop
            embeddings = []
            for text in texts:
                response = self.client.models.embed_content(
                    model=self.model,
                    contents=text
                )
                embeddings.append(response.embeddings[0].values)
            return embeddings
        except Exception as e:
            print(f"Error embedding documents: {e}")
            return []

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query."""
        try:
            response = self.client.models.embed_content(
                model=self.model,
                contents=text
            )
            return response.embeddings[0].values
        except Exception as e:
            print(f"Error embedding query: {e}")
            return []
