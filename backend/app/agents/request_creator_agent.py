import os
import json
from typing import Dict, Any, List
from google import genai
from google.genai import types
from app.rag.store import rag_store

class RequestCreatorAgent:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY", "AIzaSyAYPxArNu4w-kcu6g6mjzdY7H6NRNkMqx8")
        if not self.api_key:
            print("WARNING: GOOGLE_API_KEY not found. Agent will fail.")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
        
        self.model = "gemini-2.0-flash-exp"

    async def create_request(self, context: str, project_config: Dict[str, Any] = None, jira_schema: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Decomposes a raw request into a structured JIRA issue using RAG.
        """
        if not self.client:
            return self._fallback_creation(context)

        # 1. Retrieve Context (RAG)
        similar_tickets = rag_store.query_similar_tickets(context)
        relevant_docs = rag_store.query_docs(context)
        
        rag_context = ""
        if similar_tickets:
            rag_context += "\nSimilar Past Tickets:\n" + json.dumps(similar_tickets, indent=2)
        if relevant_docs:
            rag_context += "\nRelevant Documentation:\n" + str(relevant_docs)

        # 2. Define Schema
        if jira_schema:
            schema = jira_schema
        else:
            # Fallback schema if no JIRA config provided
            schema = {
                "summary": "string (concise title)",
                "description": "string (detailed description)",
                "issuetype": "string (Bug, Story, Task, Epic)",
                "priority": "string (High, Medium, Low)",
                "labels": "list of strings",
                "acceptance_criteria": "string (list of criteria)",
                "components": "list of strings"
            }

        # 3. Construct Prompt
        prompt = f"""
        You are an expert JIRA Request Creator Agent.
        Your goal is to decompose the following raw request into a structured JIRA issue.
        
        Use the provided RAG Context to understand the domain, similar past issues, and architectural guidelines.
        
        Raw Request:
        {context}
        
        RAG Context:
        {rag_context}
        
        IMPORTANT: You must output a valid JSON object that strictly adheres to the following schema.
        The keys in your JSON output MUST match the keys in the provided schema exactly.
        Do not invent new keys or use default JIRA keys if they are not in the schema.
        
        Target Schema (JSON):
        {json.dumps(schema, indent=2)}
        
        Instructions:
        - Map the extracted information to the fields defined in the Target Schema.
        - For fields like 'summary' or 'description', look for keys in the schema that seem to represent them (e.g., 'summary', 'Summary', 'description', 'Description').
        - Infer values for fields like Issue Type and Priority based on the schema options if available.
        
        Sizing Logic (Estimate):
        - Estimate the 'Story Points' or complexity if a relevant field exists in the schema.
        - 1-2 points: Trivial changes, typos, small UI tweaks.
        - 3-5 points: Standard features, well-understood tasks.
        - 8-13 points: Complex features, significant refactoring, high uncertainty.
        - Epic: Large initiatives that should be broken down.
        
        Issue Type Logic:
        - Epic: If it represents a large project or theme.
        - Bug: If it describes fixing an error or defect.
        - Story: If it describes a user-facing feature.
        - Task: If it describes technical work or maintenance.
        
        Ensure the output is valid JSON matching the schema.
        """

        # 4. Generate Content
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            return json.loads(response.text)
        except Exception as e:
            print(f"Error in RequestCreatorAgent: {e}")
            return self._fallback_creation(context)

    def _fallback_creation(self, context: str) -> Dict[str, Any]:
        return {
            "summary": f"New Request: {context[:50]}...",
            "description": context,
            "issuetype": "Task",
            "priority": "Medium",
            "labels": [],
            "acceptance_criteria": "To be determined."
        }

request_creator = RequestCreatorAgent()
