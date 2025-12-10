import os
import json
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

class IntakeRouterAgent:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY", "AIzaSyAYPxArNu4w-kcu6g6mjzdY7H6NRNkMqx8")
        if not self.api_key:
            print("WARNING: GOOGLE_API_KEY not found. Agent will fail.")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
        
        self.model = "gemini-2.0-flash-exp" # Using a fast model for routing

    async def route_request(self, context: str, files: list = None) -> Dict[str, Any]:
        """
        Analyzes the request context and determines the type and routing.
        """
        if not self.client:
            return {
                "type": "Unknown",
                "confidence": 0.0,
                "target_agent": "Manual",
                "reasoning": "API Key missing or Client not initialized"
            }

        prompt = f"""
        You are the Intake Router Agent for a DataOps JIRA automation system.
        Your job is to classify the incoming request into one of the following categories:
        - Bug: A problem or error in an existing system.
        - Story: A new feature or requirement.
        - Question: A general inquiry or support question.
        - Access: A request for permissions or access.
        - Other: Anything else.

        Analyze the following request context and return a JSON object with:
        - type: The category (Bug, Story, Question, Access, Other)
        - confidence: A score between 0.0 and 1.0
        - target_agent: The agent to handle this (DecompositionAgent for Bug/Story, SupportAgent for Question/Access)
        - reasoning: A brief explanation of why you chose this category.

        Request Context:
        {context}
        """

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            return result
        except Exception as e:
            print(f"Error in IntakeRouterAgent: {e}")
            return {
                "type": "Unknown",
                "confidence": 0.0,
                "target_agent": "Manual",
                "reasoning": f"Error: {str(e)}"
            }

intake_router = IntakeRouterAgent()
