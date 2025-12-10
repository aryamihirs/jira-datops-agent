import base64
from typing import Dict, List, Any, Optional
import requests
from requests.auth import HTTPBasicAuth

class JiraService:
    def __init__(self, jira_url: str, email: str, api_token: str):
        """
        Initialize JIRA service with authentication.
        
        Args:
            jira_url: Base URL (e.g., https://yourcompany.atlassian.net)
            email: Atlassian account email
            api_token: API token from https://id.atlassian.com/manage-profile/security/api-tokens
        """
        self.jira_url = jira_url.rstrip('/')
        self.auth = HTTPBasicAuth(email, api_token)
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def test_connection(self) -> Dict[str, Any]:
        """Test the JIRA connection."""
        try:
            response = requests.get(
                f"{self.jira_url}/rest/api/3/myself",
                headers=self.headers,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            return {"success": True, "user": response.json()}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def get_projects(self) -> List[Dict[str, Any]]:
        """Get all accessible projects."""
        try:
            response = requests.get(
                f"{self.jira_url}/rest/api/3/project",
                headers=self.headers,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching projects: {e}")
            return []
    
    def get_project_issue_types(self, project_key: str) -> List[Dict[str, Any]]:
        """Get issue types for a specific project."""
        try:
            response = requests.get(
                f"{self.jira_url}/rest/api/3/project/{project_key}",
                headers=self.headers,
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            project_data = response.json()
            return project_data.get('issueTypes', [])
        except requests.exceptions.RequestException as e:
            print(f"Error fetching issue types: {e}")
            return []
    
    def get_create_meta(self, project_key: str, issue_type_name: str) -> Dict[str, Any]:
        """Get metadata for creating an issue (available fields)."""
        try:
            response = requests.get(
                f"{self.jira_url}/rest/api/3/issue/createmeta",
                headers=self.headers,
                auth=self.auth,
                params={
                    "projectKeys": project_key,
                    "issuetypeNames": issue_type_name,
                    "expand": "projects.issuetypes.fields"
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching create metadata: {e}")
            return {}
    
    def create_issue(self, project_key: str, issue_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a JIRA issue.
        
        Args:
            project_key: Project key (e.g., 'PROJ')
            issue_data: Issue data including summary, description, issuetype, etc.
        """
        try:
            payload = {
                "fields": {
                    "project": {"key": project_key},
                    **issue_data
                }
            }
            
            response = requests.post(
                f"{self.jira_url}/rest/api/3/issue",
                headers=self.headers,
                auth=self.auth,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return {"success": True, "issue": response.json()}
        except requests.exceptions.RequestException as e:
            error_detail = e.response.json() if hasattr(e, 'response') and e.response else str(e)
            return {"success": False, "error": error_detail}
    
    def get_field_configuration(self, project_key: str) -> Dict[str, Any]:
        """Get field configuration for a project."""
        try:
            # Get all issue types for the project
            issue_types = self.get_project_issue_types(project_key)
            
            field_config = {}
            for issue_type in issue_types:
                meta = self.get_create_meta(project_key, issue_type['name'])
                
                if meta and 'projects' in meta and len(meta['projects']) > 0:
                    project = meta['projects'][0]
                    if 'issuetypes' in project and len(project['issuetypes']) > 0:
                        fields = project['issuetypes'][0].get('fields', {})
                        
                        field_config[issue_type['name']] = {
                            'id': issue_type['id'],
                            'fields': {
                                field_key: {
                                    'name': field_data.get('name'),
                                    'required': field_data.get('required', False),
                                    'schema': field_data.get('schema', {}),
                                    'allowedValues': field_data.get('allowedValues', [])
                                }
                                for field_key, field_data in fields.items()
                            }
                        }
            
            return field_config
        except Exception as e:
            print(f"Error getting field configuration: {e}")
            return {}
