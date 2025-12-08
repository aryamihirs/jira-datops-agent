import json
import re
from typing import Dict, Any, Optional
from app.agents.request_creator_agent import request_creator

class AIService:
    def __init__(self):
        pass

    async def extract_request_details(self, context: str, files: list = None, jira_schema: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Extracts structured request details using the Request Creator Agent (with RAG).
        """
        # Use Request Creator Agent to decompose the request
        structured_request = await request_creator.create_request(context, jira_schema=jira_schema)
        
        return structured_request

    def _extract_first_sentence(self, text: str) -> str:
        match = re.match(r'([^.!?]+[.!?])', text)
        if match:
            return match.group(1).strip()
        return text[:50] + "..." if len(text) > 50 else text

ai_service = AIService()
