# JIRA DataOps Agent - Technical Design Document (TDD)

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Status**: Active
**Owner**: Engineering Team

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Data Models](#3-data-models)
4. [API Specifications](#4-api-specifications)
5. [Service Layer](#5-service-layer)
6. [AI & RAG Architecture](#6-ai--rag-architecture)
7. [JIRA Integration](#7-jira-integration)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Database Design](#9-database-design)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Performance Optimization](#11-performance-optimization)
12. [Security](#12-security)
13. [Monitoring & Logging](#13-monitoring--logging)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │   Requests   │  │  Connections │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Knowledge Base│  │ API Client   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ API Routers  │  │   Services   │  │   AI Agents  │     │
│  │  /requests   │  │ JiraService  │  │IntakeRouter  │     │
│  │/connections  │  │  AIService   │  │RequestCreator│     │
│  │  /knowledge  │  │ParsingService│  │              │     │
│  │  /dashboard  │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Database    │  │  RAG System  │                        │
│  │ (SQLAlchemy) │  │  (Pinecone)  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │    JIRA      │    │   Pinecone   │
│   (Neon)     │    │  Cloud API   │    │  Vector DB   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 1.2 Component Responsibilities

#### **Frontend (Next.js + React)**
- User interface and interactions
- Client-side routing (App Router)
- API calls to backend
- State management
- Form validation
- Real-time updates (future: WebSockets)

#### **Backend (FastAPI + Python)**
- REST API endpoints
- Business logic
- Database operations
- External API integration (JIRA, Google AI, Pinecone)
- Document parsing
- Authentication & authorization (future)

#### **Database (PostgreSQL)**
- Persistent data storage
- Relational data (requests, connections, knowledge items)
- Transactional integrity

#### **Vector Database (Pinecone)**
- Semantic search
- Document embeddings
- JIRA ticket embeddings
- Similarity queries

#### **External Services**
- **JIRA**: Ticket creation, field discovery, metrics sync
- **Google Generative AI**: LLM for request analysis
- **Google Embeddings**: Text embeddings for RAG

### 1.3 Data Flow

#### **Request Creation Flow**
```
1. User uploads document → Frontend
2. Frontend → POST /api/requests/ → Backend
3. Backend → ParsingService.parse_document() → Extract text
4. Backend → AIService.extract_request_details() → AI analysis
5. AIService → RequestCreatorAgent.create_request() → Field extraction
6. RequestCreatorAgent → RAG query → Pinecone → Similar tickets
7. Backend → Save to database → PostgreSQL
8. Backend → Return request object → Frontend
9. Frontend → Update UI
```

#### **Request Release Flow**
```
1. User clicks "Release" → Frontend
2. Frontend → POST /api/requests/release → Backend
3. Backend → Fetch JIRA connection → Database
4. Backend → JiraService.create_issue() → JIRA API
5. JIRA → Return issue key (PROJ-123)
6. Backend → Update request.jira_issue_key → Database
7. Backend → Return result → Frontend
8. Frontend → Update UI with JIRA link
```

#### **JIRA Metrics Sync Flow** (Planned v1.1)
```
1. Background job (every 5 min) → Celery/APScheduler
2. Job → JiraMetricsService.sync_all_active_issues()
3. For each active request:
   a. Fetch issue from JIRA API
   b. Extract status, assignee, time tracking
   c. Process changelog → Status history
   d. Extract comments
   e. Calculate derived metrics
   f. Save to jira_metrics table
4. Frontend polls /api/jira-metrics/summary → Display on dashboard
```

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.7 | React framework with App Router |
| **React** | 19.2.0 | UI component library |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4 | Utility-first CSS framework |
| **Headless UI** | 2.2.9 | Accessible UI components |
| **Heroicons** | 2.2.0 | SVG icon library |

### 2.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.5 | Modern Python web framework |
| **Python** | 3.11+ | Programming language |
| **SQLAlchemy** | 2.0.36 | ORM for database |
| **Uvicorn** | 0.32.1 | ASGI server |
| **Mangum** | 0.17+ | ASGI-to-Lambda adapter (Vercel) |
| **Pydantic** | 2.10.2 | Data validation |

### 2.3 AI & Machine Learning

| Technology | Version | Purpose |
|------------|---------|---------|
| **Google Generative AI** | 0.8.0+ | LLM (Gemini 2.0 Flash) |
| **Google Text Embeddings** | - | Text embeddings (text-embedding-004) |
| **Pinecone** | 5.0+ | Vector database |

### 2.4 Integrations

| Technology | Version | Purpose |
|------------|---------|---------|
| **JIRA Python SDK** | 3.8.0 | JIRA Cloud API client |
| **Slack SDK** | 3.33.4 | Slack API (future) |
| **pypdf** | 4.0+ | PDF parsing |
| **python-docx** | 1.1+ | Word document parsing |
| **python-pptx** | 0.6.21 | PowerPoint parsing |

### 2.5 Infrastructure

| Technology | Purpose |
|------------|---------|
| **PostgreSQL (Neon)** | Production database |
| **SQLite** | Local development database |
| **Vercel** | Frontend & backend hosting |
| **Redis** | Caching & task queue (future) |
| **Celery** | Background jobs (future) |

---

## 3. Data Models

### 3.1 Request Model

**Table**: `requests`

```python
class Request(Base):
    __tablename__ = "requests"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Core Fields
    summary = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="Under Review")  # Under Review, Approved, Rejected, Released

    # Source Information
    source_tag = Column(String)  # email, slack, manual, file_upload
    source_content = Column(JSON)  # Original email, Slack message, file metadata

    # JIRA-related Fields
    issue_type = Column(String)  # Bug, Story, Task, Epic
    priority = Column(String)  # Highest, High, Medium, Low
    acceptance_criteria = Column(Text)
    requestor = Column(String)
    assignee = Column(String, nullable=True)
    business_unit = Column(String, nullable=True)
    tags = Column(JSON, default=list)  # ["data-pull", "quarterly"]

    # JIRA Integration
    jira_issue_key = Column(String, nullable=True)  # PROJ-123
    released_at = Column(DateTime, nullable=True)

    # AI Metadata
    confidence_score = Column(Float, nullable=True)  # 0.0 to 1.0
    extracted_fields = Column(JSON, nullable=True)  # Full AI extraction result

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**TypeScript Interface**:

```typescript
interface Request {
  id: number;
  summary: string;
  description: string;
  status: 'Under Review' | 'Approved' | 'Rejected' | 'Released';
  source_tag: 'email' | 'slack' | 'manual' | 'file_upload';
  source_content?: Record<string, any>;
  issue_type: string;
  priority: string;
  acceptance_criteria?: string;
  requestor: string;
  assignee?: string;
  business_unit?: string;
  tags: string[];
  jira_issue_key?: string;
  released_at?: string;
  confidence_score?: number;
  extracted_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### 3.2 Connection Model

**Table**: `connections`

```python
class Connection(Base):
    __tablename__ = "connections"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Connection Metadata
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # jira, email, slack
    status = Column(String, default="active")  # active, inactive, error

    # JIRA-specific Fields
    jira_url = Column(String, nullable=True)
    jira_email = Column(String, nullable=True)
    jira_api_token = Column(String, nullable=True)  # TODO: Encrypt
    jira_project_key = Column(String, nullable=True)

    # Email-specific Fields
    email_server = Column(String, nullable=True)
    email_port = Column(Integer, nullable=True)
    email_username = Column(String, nullable=True)
    email_password = Column(String, nullable=True)  # TODO: Encrypt

    # Slack-specific Fields
    slack_bot_token = Column(String, nullable=True)  # TODO: Encrypt
    slack_channel_ids = Column(JSON, nullable=True)

    # Field Configuration
    field_config = Column(JSON, nullable=True)  # Dynamic JIRA field mappings

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_tested_at = Column(DateTime, nullable=True)
```

**TypeScript Interface**:

```typescript
interface Connection {
  id: number;
  name: string;
  type: 'jira' | 'email' | 'slack';
  status: 'active' | 'inactive' | 'error';
  jira_url?: string;
  jira_email?: string;
  jira_api_token?: string;
  jira_project_key?: string;
  email_server?: string;
  email_port?: number;
  email_username?: string;
  slack_channel_ids?: string[];
  field_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
}
```

### 3.3 Knowledge Item Model

**Table**: `knowledge_items`

```python
class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Identification
    item_id = Column(String, unique=True, nullable=False)  # UUID or JIRA key
    item_type = Column(String, nullable=False)  # document, jira_ticket

    # Metadata
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Document-specific
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)

    # JIRA ticket-specific
    jira_key = Column(String, nullable=True)
    jira_status = Column(String, nullable=True)
    jira_issue_type = Column(String, nullable=True)

    # Vector DB Metadata
    chunk_count = Column(Integer, default=0)
    embedding_model = Column(String, default="text-embedding-004")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 3.4 JIRA Metrics Models (v1.1)

**Table**: `jira_metrics`

```python
class JiraMetric(Base):
    __tablename__ = "jira_metrics"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    jira_issue_key = Column(String, nullable=False, index=True)

    # Current State
    current_status = Column(String)
    current_assignee = Column(String, nullable=True)
    current_priority = Column(String)
    resolution = Column(String, nullable=True)
    resolution_date = Column(DateTime, nullable=True)

    # Time Tracking
    time_spent_seconds = Column(Integer, default=0)
    time_estimated_seconds = Column(Integer, nullable=True)
    time_remaining_seconds = Column(Integer, nullable=True)

    # Workflow Metrics
    status_changes = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    attachment_count = Column(Integer, default=0)

    # Milestone Timestamps
    jira_created_at = Column(DateTime, nullable=False)
    jira_updated_at = Column(DateTime, nullable=True)
    first_transition_at = Column(DateTime, nullable=True)
    in_progress_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Calculated Metrics (in seconds)
    time_to_start_seconds = Column(Integer, nullable=True)
    time_to_resolve_seconds = Column(Integer, nullable=True)
    time_to_close_seconds = Column(Integer, nullable=True)

    # Sync Metadata
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    sync_count = Column(Integer, default=1)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    request = relationship("Request", back_populates="jira_metric")
```

**Table**: `jira_status_history`

```python
class JiraStatusHistory(Base):
    __tablename__ = "jira_status_history"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key
    jira_metric_id = Column(Integer, ForeignKey("jira_metrics.id"), nullable=False)
    jira_issue_key = Column(String, nullable=False, index=True)

    # Status Transition
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)

    # Actor
    changed_by = Column(String)

    # Timing
    changed_at = Column(DateTime, nullable=False, index=True)
    duration_in_previous_status_seconds = Column(Integer, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    jira_metric = relationship("JiraMetric", back_populates="status_history")
```

---

## 4. API Specifications

### 4.1 Request Endpoints

#### **POST /api/requests/**
Create a new request

**Request Body**:
```json
{
  "summary": "Need Q4 sales data for board presentation",
  "description": "Require sales data from Oct-Dec 2025...",
  "source_tag": "manual",
  "source_content": {}
}
```

**Response**: `201 Created`
```json
{
  "id": 123,
  "summary": "Need Q4 sales data for board presentation",
  "description": "...",
  "status": "Under Review",
  "confidence_score": 0.89,
  "extracted_fields": { ... },
  "created_at": "2026-01-08T10:30:00Z"
}
```

---

#### **GET /api/requests/**
List all requests with filtering

**Query Parameters**:
- `status`: Filter by status
- `source_tag`: Filter by source
- `search`: Keyword search
- `skip`: Pagination offset (default: 0)
- `limit`: Page size (default: 20)

**Response**: `200 OK`
```json
{
  "items": [ ... ],
  "total": 145,
  "skip": 0,
  "limit": 20
}
```

---

#### **GET /api/requests/{id}**
Get single request by ID

**Response**: `200 OK`
```json
{
  "id": 123,
  "summary": "...",
  "status": "Approved",
  "jira_issue_key": "PROJ-456",
  ...
}
```

---

#### **PATCH /api/requests/{id}**
Update request fields

**Request Body**:
```json
{
  "summary": "Updated summary",
  "priority": "High",
  "status": "Approved"
}
```

**Response**: `200 OK` (updated request)

---

#### **POST /api/requests/analyze**
Analyze request content with AI

**Request Body**:
```json
{
  "content": "Need sales data for Q4 board meeting...",
  "context": "manual"
}
```

**Response**: `200 OK`
```json
{
  "summary": "Q4 Sales Data Request",
  "description": "...",
  "issue_type": "Story",
  "priority": "High",
  "confidence_score": 0.89,
  "similar_tickets": [ ... ],
  "relevant_docs": [ ... ]
}
```

---

#### **POST /api/requests/release**
Release approved requests to JIRA

**Request Body**:
```json
{
  "request_ids": [123, 124, 125]
}
```

**Response**: `200 OK`
```json
{
  "results": [
    {
      "request_id": 123,
      "success": true,
      "jira_issue_key": "PROJ-456",
      "jira_url": "https://company.atlassian.net/browse/PROJ-456"
    },
    {
      "request_id": 124,
      "success": false,
      "error": "Missing required field: priority"
    }
  ]
}
```

---

#### **GET /api/requests/export**
Export requests to CSV

**Query Parameters**:
- `status`: Filter by status
- `start_date`: ISO date
- `end_date`: ISO date

**Response**: `200 OK` (CSV file download)

---

### 4.2 Connection Endpoints

#### **POST /api/connections/**
Create new connection

**Request Body**:
```json
{
  "name": "Main JIRA",
  "type": "jira",
  "jira_url": "https://company.atlassian.net",
  "jira_email": "user@company.com",
  "jira_api_token": "abc123...",
  "jira_project_key": "PROJ"
}
```

**Response**: `201 Created`

---

#### **GET /api/connections/**
List all connections

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Main JIRA",
    "type": "jira",
    "status": "active",
    "jira_project_key": "PROJ",
    "last_tested_at": "2026-01-08T10:00:00Z"
  }
]
```

---

#### **POST /api/connections/{id}/test**
Test connection

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Connection successful",
  "projects": [
    { "key": "PROJ", "name": "DataOps Project" }
  ]
}
```

---

#### **GET /api/connections/{id}/field-config**
Get JIRA field configuration

**Query Parameters**:
- `issue_type`: Issue type (Bug, Story, etc.)

**Response**: `200 OK`
```json
{
  "issue_type": "Story",
  "fields": {
    "summary": { "required": true, "type": "string" },
    "description": { "required": false, "type": "string" },
    "priority": {
      "required": true,
      "type": "select",
      "allowed_values": ["Highest", "High", "Medium", "Low"]
    },
    "customfield_10050": {
      "name": "Data Classification",
      "type": "select",
      "allowed_values": ["Public", "Internal", "Confidential"]
    }
  }
}
```

---

### 4.3 Knowledge Base Endpoints

#### **POST /api/knowledge/upload**
Upload document to knowledge base

**Request**: `multipart/form-data`
- `file`: Document file (PDF, DOCX, PPTX)

**Response**: `201 Created`
```json
{
  "item_id": "uuid-123",
  "title": "Data Dictionary.pdf",
  "file_size": 1024000,
  "chunk_count": 47,
  "status": "indexed"
}
```

---

#### **GET /api/knowledge/**
List knowledge base items

**Response**: `200 OK`
```json
[
  {
    "item_id": "uuid-123",
    "item_type": "document",
    "title": "Data Dictionary.pdf",
    "chunk_count": 47,
    "created_at": "2026-01-08T09:00:00Z"
  }
]
```

---

#### **DELETE /api/knowledge/{item_id}**
Delete knowledge item

**Response**: `204 No Content`

---

### 4.4 Dashboard Endpoints

#### **GET /api/dashboard/metrics**
Get dashboard metrics

**Response**: `200 OK`
```json
{
  "total_requests": 456,
  "pending_approval": 23,
  "approved": 12,
  "released": 421,
  "trends": {
    "total_requests": 8.5,
    "pending_approval": -12.3,
    "approved": 5.0,
    "released": 9.2
  }
}
```

---

#### **GET /api/dashboard/activity**
Get recent activity

**Query Parameters**:
- `limit`: Number of activities (default: 20)
- `offset`: Pagination offset (default: 0)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "type": "request_released",
    "title": "Request released to JIRA",
    "description": "Q4 Sales Data Request → PROJ-456",
    "timestamp": "2026-01-08T10:30:00Z",
    "metadata": {
      "request_id": 123,
      "jira_key": "PROJ-456"
    }
  }
]
```

---

### 4.5 JIRA Metrics Endpoints (v1.1)

#### **POST /api/jira-metrics/sync/{request_id}**
Sync JIRA metrics for specific request

**Response**: `200 OK`
```json
{
  "success": true,
  "metric": {
    "request_id": 123,
    "jira_issue_key": "PROJ-456",
    "current_status": "In Progress",
    "current_assignee": "Jane Smith",
    "time_to_start_seconds": 7200,
    "last_synced_at": "2026-01-08T10:30:00Z"
  }
}
```

---

#### **POST /api/jira-metrics/sync/all**
Sync all active JIRA issues

**Query Parameters**:
- `hours_back`: How far back to sync (default: 24)

**Response**: `200 OK`
```json
{
  "synced": 45,
  "errors": 2,
  "skipped": 3
}
```

---

#### **GET /api/jira-metrics/{request_id}**
Get JIRA metrics for request

**Response**: `200 OK`
```json
{
  "request_id": 123,
  "jira_issue_key": "PROJ-456",
  "current_status": "In Progress",
  "current_assignee": "Jane Smith",
  "time_to_start_seconds": 7200,
  "time_to_resolve_seconds": null,
  "status_changes": 3,
  "comment_count": 5
}
```

---

#### **GET /api/jira-metrics/{request_id}/status-history**
Get status change history

**Response**: `200 OK`
```json
[
  {
    "from_status": "To Do",
    "to_status": "In Progress",
    "changed_by": "Jane Smith",
    "changed_at": "2026-01-08T08:00:00Z",
    "duration_in_previous_status_seconds": 7200
  }
]
```

---

#### **GET /api/jira-metrics/summary**
Get aggregate JIRA metrics

**Query Parameters**:
- `days`: Time range (default: 30)

**Response**: `200 OK`
```json
{
  "total_issues": 145,
  "avg_time_to_start_hours": 3.2,
  "avg_time_to_resolve_hours": 44.5,
  "avg_time_to_close_hours": 48.2,
  "avg_status_changes": 4.5,
  "avg_comments": 6.8,
  "resolution_rate": 94.5
}
```

---

## 5. Service Layer

### 5.1 JiraService

**File**: `backend/app/services/jira_service.py`

**Responsibilities**:
- JIRA API authentication
- Issue creation
- Field discovery
- Project metadata retrieval
- Connection testing

**Key Methods**:

```python
class JiraService:
    def __init__(self, connection: Connection):
        self.client = JIRA(
            server=connection.jira_url,
            basic_auth=(connection.jira_email, connection.jira_api_token)
        )

    def test_connection(self) -> dict:
        """Test JIRA connection and return server info"""

    def get_projects(self) -> List[dict]:
        """Fetch available JIRA projects"""

    def get_create_metadata(self, project_key: str, issue_type: str) -> dict:
        """Get field requirements for issue type"""

    def create_issue(self, fields: dict) -> dict:
        """Create JIRA issue and return issue key"""

    def get_issue(self, issue_key: str) -> dict:
        """Fetch JIRA issue details"""
```

---

### 5.2 AIService

**File**: `backend/app/services/ai_service.py`

**Responsibilities**:
- Orchestrate AI agents
- Request analysis
- Field extraction
- RAG query coordination

**Key Methods**:

```python
class AIService:
    def __init__(self, rag_store: RAGStore):
        self.intake_router = IntakeRouterAgent()
        self.request_creator = RequestCreatorAgent(rag_store)

    async def extract_request_details(
        self,
        content: str,
        jira_field_config: dict
    ) -> dict:
        """Analyze request and extract JIRA fields"""

        # Step 1: Classify request type
        classification = await self.intake_router.classify(content)

        # Step 2: Extract fields with RAG context
        extracted = await self.request_creator.create_request(
            content=content,
            classification=classification,
            field_config=jira_field_config
        )

        return extracted
```

---

### 5.3 ParsingService

**File**: `backend/app/services/parsing_service.py`

**Responsibilities**:
- Document text extraction
- File type detection
- Content chunking

**Key Methods**:

```python
class ParsingService:
    def parse_document(self, file_path: str, mime_type: str) -> str:
        """Extract text from document based on type"""

        if mime_type == "application/pdf":
            return self._parse_pdf(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return self._parse_docx(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            return self._parse_pptx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF using pypdf"""

    def _parse_docx(self, file_path: str) -> str:
        """Extract text from Word document using python-docx"""

    def _parse_pptx(self, file_path: str) -> str:
        """Extract text from PowerPoint using python-pptx"""

    def chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        """Split text into chunks for embedding"""
```

---

### 5.4 JiraMetricsService (v1.1)

**File**: `backend/app/services/jira_metrics_service.py`

**Responsibilities**:
- Sync JIRA metrics
- Process changelog
- Calculate derived metrics
- Track status history

**Key Methods**:

```python
class JiraMetricsService:
    def __init__(self, db: Session, jira_service: JiraService):
        self.db = db
        self.jira_service = jira_service

    async def sync_metrics_for_request(self, request_id: int) -> JiraMetric:
        """Sync JIRA metrics for single request"""

    async def sync_all_active_issues(self, hours_back: int = 24) -> dict:
        """Sync all active JIRA issues"""

    async def _process_changelog(self, metric: JiraMetric, changelog):
        """Extract status transitions from changelog"""

    async def _sync_comments(self, metric: JiraMetric, comments: List):
        """Sync JIRA comments to database"""

    def _calculate_derived_metrics(self, metric: JiraMetric) -> JiraMetric:
        """Calculate time-based metrics"""

    def get_metrics_summary(self, days: int = 30) -> dict:
        """Get aggregate metrics"""
```

---

## 6. AI & RAG Architecture

### 6.1 AI Agent Architecture

```
User Request Content
        ↓
┌──────────────────────────────────────┐
│   IntakeRouterAgent                  │
│   - Classifies request type          │
│   - Returns: Bug/Story/Task/etc.     │
│   - Confidence score                 │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│   RequestCreatorAgent                │
│   Step 1: RAG Query                  │
│   - Similar tickets                  │
│   - Relevant docs                    │
│                                       │
│   Step 2: LLM Extraction             │
│   - Prompt with context              │
│   - Extract JIRA fields              │
│   - Return structured JSON           │
└──────────────┬───────────────────────┘
               ↓
    Structured Request Fields
```

### 6.2 IntakeRouterAgent

**File**: `backend/app/agents/intake_router_agent.py`

**Purpose**: Classify request into issue types

**Prompt Template**:

```python
CLASSIFICATION_PROMPT = """
You are a JIRA issue classifier for a DataOps team.

Classify the following request into ONE of these categories:
- Bug: System error, data pipeline failure, broken functionality
- Story: New feature, data pull request, analysis requirement
- Task: Routine work, configuration change, maintenance
- Question: Information request, clarification needed
- Access Request: Permission, access, credentials needed

Request:
{content}

Respond ONLY with a JSON object:
{{
  "issue_type": "Bug|Story|Task|Question|Access Request",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}
"""
```

**Implementation**:

```python
class IntakeRouterAgent:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    async def classify(self, content: str) -> dict:
        prompt = CLASSIFICATION_PROMPT.format(content=content)
        response = self.model.generate_content(prompt)

        # Parse JSON response
        result = json.loads(response.text)

        return {
            "issue_type": result["issue_type"],
            "confidence": result["confidence"],
            "reasoning": result["reasoning"]
        }
```

---

### 6.3 RequestCreatorAgent

**File**: `backend/app/agents/request_creator_agent.py`

**Purpose**: Extract structured JIRA fields from request content

**Prompt Template**:

```python
EXTRACTION_PROMPT = """
You are a JIRA ticket creator for a DataOps team.

Extract JIRA fields from the request below. Use the provided context for consistency.

## Similar Past Tickets:
{similar_tickets}

## Relevant Documentation:
{relevant_docs}

## JIRA Field Requirements:
{field_config}

## Request Content:
{content}

Extract and return a JSON object with these fields:
{{
  "summary": "concise title (max 100 chars)",
  "description": "detailed description with all requirements",
  "issue_type": "Bug|Story|Task|Epic",
  "priority": "Highest|High|Medium|Low",
  "requestor": "person making the request",
  "assignee": "suggested assignee (or null)",
  "acceptance_criteria": "bullet list of done conditions",
  "tags": ["tag1", "tag2"],
  "custom_fields": {{
    "Data Classification": "Public|Internal|Confidential",
    "Business Unit": "Finance|Marketing|Sales|etc."
  }}
}}

Important:
- Use similar tickets as examples for formatting
- Reference documentation when available
- Validate all values against field_config
- If uncertain, use null or reasonable default
"""
```

**Implementation**:

```python
class RequestCreatorAgent:
    def __init__(self, rag_store: RAGStore):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.rag_store = rag_store

    async def create_request(
        self,
        content: str,
        classification: dict,
        field_config: dict
    ) -> dict:
        # Step 1: Query RAG for context
        similar_tickets = await self.rag_store.query_similar_tickets(content, top_k=5)
        relevant_docs = await self.rag_store.query_documents(content, top_k=3)

        # Step 2: Build prompt with context
        prompt = EXTRACTION_PROMPT.format(
            content=content,
            similar_tickets=self._format_tickets(similar_tickets),
            relevant_docs=self._format_docs(relevant_docs),
            field_config=json.dumps(field_config, indent=2)
        )

        # Step 3: Generate with LLM
        response = self.model.generate_content(prompt)

        # Step 4: Parse and validate
        extracted = json.loads(response.text)

        return {
            "extracted_fields": extracted,
            "confidence_score": classification["confidence"],
            "rag_context": {
                "similar_tickets": similar_tickets,
                "relevant_docs": relevant_docs
            }
        }
```

---

### 6.4 RAG System Architecture

```
┌─────────────────────────────────────────────┐
│            RAG Store (Pinecone)              │
├─────────────────────────────────────────────┤
│                                              │
│  Index 1: JIRA Tickets                      │
│  - Vectors: 768-dim embeddings              │
│  - Metadata: key, summary, description,     │
│              status, resolution              │
│                                              │
│  Index 2: Documentation                     │
│  - Vectors: 768-dim embeddings              │
│  - Metadata: title, file_path, chunk_id     │
│                                              │
└─────────────────────────────────────────────┘
           ↑                      ↓
    Query Vector           Top-K Results
           ↑                      ↓
┌─────────────────────────────────────────────┐
│       Google Embedding Service               │
│       (text-embedding-004)                   │
│       - Input: text                          │
│       - Output: 768-dim vector               │
└─────────────────────────────────────────────┘
```

**File**: `backend/app/rag/store_pinecone.py`

**Key Methods**:

```python
class PineconeRAGStore:
    def __init__(self):
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.embeddings = GoogleEmbeddings()
        self.tickets_index = self.pc.Index("jira-tickets")
        self.docs_index = self.pc.Index("documentation")

    async def add_document(self, item_id: str, text: str, metadata: dict):
        """Add document to knowledge base"""

        # Chunk text
        chunks = self._chunk_text(text)

        # Generate embeddings
        vectors = []
        for i, chunk in enumerate(chunks):
            embedding = await self.embeddings.embed(chunk)
            vectors.append({
                "id": f"{item_id}_chunk_{i}",
                "values": embedding,
                "metadata": {
                    **metadata,
                    "chunk_id": i,
                    "text": chunk
                }
            })

        # Upsert to Pinecone
        self.docs_index.upsert(vectors)

    async def query_similar_tickets(self, query: str, top_k: int = 5) -> List[dict]:
        """Find similar JIRA tickets"""

        # Generate query embedding
        query_vector = await self.embeddings.embed(query)

        # Query Pinecone
        results = self.tickets_index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True
        )

        return [
            {
                "jira_key": match["metadata"]["jira_key"],
                "summary": match["metadata"]["summary"],
                "score": match["score"]
            }
            for match in results["matches"]
        ]

    async def query_documents(self, query: str, top_k: int = 3) -> List[dict]:
        """Find relevant documentation"""

        query_vector = await self.embeddings.embed(query)

        results = self.docs_index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True
        )

        return [
            {
                "title": match["metadata"]["title"],
                "text": match["metadata"]["text"],
                "score": match["score"]
            }
            for match in results["matches"]
        ]
```

---

## 7. JIRA Integration

### 7.1 Authentication

**Method**: HTTP Basic Auth
- Username: JIRA email (e.g., user@company.com)
- Password: JIRA API token (generated in Atlassian account settings)

**Implementation**:

```python
from jira import JIRA

client = JIRA(
    server="https://company.atlassian.net",
    basic_auth=("user@company.com", "api_token_here")
)
```

### 7.2 Issue Creation Flow

```
1. Fetch JIRA connection from database
2. Initialize JIRA client with credentials
3. Get field configuration for issue type
4. Validate request fields against configuration
5. Map request fields to JIRA field IDs
6. Call JIRA API: create_issue()
7. Return issue key (e.g., PROJ-123)
8. Update request with JIRA key
9. Change request status to "Released"
```

**Code**:

```python
def create_jira_issue(request: Request, connection: Connection) -> str:
    # Initialize client
    jira = JIRA(
        server=connection.jira_url,
        basic_auth=(connection.jira_email, connection.jira_api_token)
    )

    # Build fields dictionary
    fields = {
        "project": {"key": connection.jira_project_key},
        "summary": request.summary,
        "description": request.description,
        "issuetype": {"name": request.issue_type},
        "priority": {"name": request.priority},
    }

    # Add custom fields from field_config
    field_config = connection.field_config or {}
    for field_name, field_value in request.extracted_fields.get("custom_fields", {}).items():
        field_id = field_config.get(field_name, {}).get("id")
        if field_id:
            fields[field_id] = {"value": field_value}

    # Create issue
    issue = jira.create_issue(fields=fields)

    return issue.key
```

### 7.3 Field Discovery

**Purpose**: Dynamically discover JIRA project fields

**API**: `GET /rest/api/3/issue/createmeta`

**Response**:

```json
{
  "projects": [
    {
      "key": "PROJ",
      "issuetypes": [
        {
          "name": "Story",
          "fields": {
            "summary": {
              "required": true,
              "schema": { "type": "string" }
            },
            "customfield_10050": {
              "required": false,
              "name": "Data Classification",
              "schema": {
                "type": "option",
                "custom": "com.atlassian.jira.plugin.system.customfieldtypes:select"
              },
              "allowedValues": [
                { "value": "Public" },
                { "value": "Internal" },
                { "value": "Confidential" }
              ]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 8. Frontend Architecture

### 8.1 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Dashboard page
│   ├── requests/
│   │   └── page.tsx              # Requests queue page
│   ├── connections/
│   │   └── page.tsx              # Connections management
│   └── knowledge-base/
│       └── page.tsx              # Knowledge base page
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Card.tsx
│   ├── layout/                   # Layout components
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Assistant.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── QuickActions.tsx
│   ├── requests/
│   │   ├── RequestCard.tsx
│   │   ├── RequestModal.tsx
│   │   └── RequestFilters.tsx
│   └── connections/
│       ├── ConnectionCard.tsx
│       └── ConnectionModal.tsx
├── lib/
│   ├── api/
│   │   └── client.ts             # API client
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── utils/
│       └── format.ts             # Utility functions
└── public/                       # Static assets
```

### 8.2 API Client

**File**: `frontend/lib/api/client.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

// Example usage
export async function getRequests(params?: {
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<{ items: Request[]; total: number }> {
  const queryString = new URLSearchParams(params as any).toString();
  return apiCall(`/api/requests/?${queryString}`);
}

export async function createRequest(data: Partial<Request>): Promise<Request> {
  return apiCall('/api/requests/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function releaseRequests(request_ids: number[]): Promise<any> {
  return apiCall('/api/requests/release', {
    method: 'POST',
    body: JSON.stringify({ request_ids }),
  });
}
```

### 8.3 State Management

**Approach**: React hooks + Context API (no Redux needed for now)

**Example**: Request context

```typescript
// contexts/RequestContext.tsx

interface RequestContextType {
  requests: Request[];
  loading: boolean;
  fetchRequests: (params?: any) => Promise<void>;
  updateRequest: (id: number, data: Partial<Request>) => Promise<void>;
  releaseRequests: (ids: number[]) => Promise<void>;
}

export const RequestContext = createContext<RequestContextType | undefined>(undefined);

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async (params?: any) => {
    setLoading(true);
    try {
      const data = await getRequests(params);
      setRequests(data.items);
    } finally {
      setLoading(false);
    }
  };

  // ... other methods

  return (
    <RequestContext.Provider value={{ requests, loading, fetchRequests, updateRequest, releaseRequests }}>
      {children}
    </RequestContext.Provider>
  );
}
```

---

## 9. Database Design

### 9.1 Schema Diagram

```
┌─────────────────────┐
│      requests       │
├─────────────────────┤
│ id (PK)             │
│ summary             │
│ description         │
│ status              │
│ source_tag          │
│ source_content      │
│ issue_type          │
│ priority            │
│ jira_issue_key      │
│ released_at         │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │ 1:1
           │
           ↓
┌─────────────────────┐
│   jira_metrics      │
├─────────────────────┤
│ id (PK)             │
│ request_id (FK)     │
│ jira_issue_key      │
│ current_status      │
│ time_to_start       │
│ time_to_resolve     │
│ status_changes      │
│ created_at          │
└──────────┬──────────┘
           │ 1:N
           │
           ↓
┌─────────────────────┐
│ jira_status_history │
├─────────────────────┤
│ id (PK)             │
│ jira_metric_id (FK) │
│ from_status         │
│ to_status           │
│ changed_by          │
│ changed_at          │
│ duration_seconds    │
└─────────────────────┘

┌─────────────────────┐
│   connections       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ type                │
│ status              │
│ jira_url            │
│ jira_api_token      │
│ field_config        │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│  knowledge_items    │
├─────────────────────┤
│ id (PK)             │
│ item_id             │
│ item_type           │
│ title               │
│ file_path           │
│ chunk_count         │
│ created_at          │
└─────────────────────┘
```

### 9.2 Indexes

**Critical Indexes**:

```sql
-- Requests table
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_source_tag ON requests(source_tag);
CREATE INDEX idx_requests_jira_issue_key ON requests(jira_issue_key);
CREATE INDEX idx_requests_created_at ON requests(created_at);

-- JIRA Metrics table
CREATE INDEX idx_jira_metrics_request_id ON jira_metrics(request_id);
CREATE INDEX idx_jira_metrics_jira_issue_key ON jira_metrics(jira_issue_key);
CREATE INDEX idx_jira_metrics_current_status ON jira_metrics(current_status);

-- JIRA Status History
CREATE INDEX idx_jira_status_history_metric_id ON jira_status_history(jira_metric_id);
CREATE INDEX idx_jira_status_history_changed_at ON jira_status_history(changed_at);

-- Connections
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_connections_status ON connections(status);

-- Knowledge Items
CREATE INDEX idx_knowledge_items_item_id ON knowledge_items(item_id);
CREATE INDEX idx_knowledge_items_item_type ON knowledge_items(item_type);
```

---

## 10. Deployment Architecture

### 10.1 Vercel Deployment

```
GitHub Repository
       ↓
   Git Push
       ↓
┌──────────────────────┐
│  Vercel Platform     │
├──────────────────────┤
│                      │
│  Frontend Build:     │
│  - npm install       │
│  - npm run build     │
│  - Deploy to CDN     │
│                      │
│  Backend Build:      │
│  - pip install       │
│  - Create functions  │
│  - Deploy serverless │
│                      │
└──────────────────────┘
       ↓
┌──────────────────────┐
│  Production URLs     │
├──────────────────────┤
│  Frontend:           │
│  jira-agent.vercel   │
│  .app                │
│                      │
│  Backend API:        │
│  jira-agent-api      │
│  .vercel.app         │
└──────────────────────┘
```

### 10.2 Environment Variables

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=https://jira-agent-api.vercel.app
```

**Backend (.env)**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# JIRA (optional if using connections table)
JIRA_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=token_here

# AI & Vector DB
GOOGLE_API_KEY=google_api_key
PINECONE_API_KEY=pinecone_api_key

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### 10.3 Vercel Configuration

**vercel.json** (Backend):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "GOOGLE_API_KEY": "@google_api_key",
    "PINECONE_API_KEY": "@pinecone_api_key"
  }
}
```

---

## 11. Performance Optimization

### 11.1 Database Query Optimization

**Strategies**:
- Eager loading with `joinedload()` for relationships
- Pagination for large datasets (LIMIT/OFFSET)
- Selective column loading with `load_only()`
- Caching frequent queries (Redis in future)

**Example**:

```python
# Optimized request query with metrics
requests = db.query(Request)\
    .options(joinedload(Request.jira_metric))\
    .filter(Request.status == 'Released')\
    .order_by(Request.created_at.desc())\
    .limit(20)\
    .all()
```

### 11.2 API Response Caching (Future)

**Strategy**: Redis cache for read-heavy endpoints

**Example**:

```python
from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, db=0)

@router.get("/api/dashboard/metrics")
async def get_metrics():
    # Check cache
    cached = redis_client.get("dashboard:metrics")
    if cached:
        return json.loads(cached)

    # Compute metrics
    metrics = compute_metrics()

    # Cache for 30 seconds
    redis_client.setex("dashboard:metrics", 30, json.dumps(metrics))

    return metrics
```

### 11.3 Frontend Optimization

**Strategies**:
- Code splitting with Next.js dynamic imports
- Image optimization with Next.js Image component
- Debounce search inputs
- Virtualize long lists (react-window)
- Lazy load modals

**Example**:

```typescript
// Lazy load modal
const RequestModal = dynamic(() => import('@/components/requests/RequestModal'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

---

## 12. Security

### 12.1 API Security

**CORS Configuration**:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://jira-agent.vercel.app",
        "https://*.vercel.app"  # Preview deployments
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Rate Limiting** (Future):

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/requests/")
@limiter.limit("100/minute")
async def get_requests(request: Request):
    ...
```

### 12.2 Credential Storage

**Current**: Stored in database (plain text - NOT SECURE)

**Future (v1.3)**:
- Encrypt credentials with Fernet (symmetric encryption)
- Store encryption key in environment variable
- Decrypt only when needed in memory

**Example**:

```python
from cryptography.fernet import Fernet

# Generate key (one time, store in .env)
key = Fernet.generate_key()

# Encrypt
cipher = Fernet(key)
encrypted_token = cipher.encrypt(b"api_token_here")

# Decrypt
decrypted_token = cipher.decrypt(encrypted_token)
```

### 12.3 Authentication (Future)

**Planned**: JWT-based authentication

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/protected")
async def protected_route(user = Depends(verify_token)):
    return {"user": user}
```

---

## 13. Monitoring & Logging

### 13.1 Logging Strategy

**Library**: loguru

**Configuration**:

```python
from loguru import logger

logger.add(
    "logs/app_{time}.log",
    rotation="500 MB",
    retention="10 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
)

# Usage
logger.info("Request created", request_id=123, status="Under Review")
logger.error("JIRA API error", error=str(e), jira_url=connection.jira_url)
```

### 13.2 Application Metrics

**Key Metrics to Track**:
- Request rate (requests/second)
- Error rate (% of failed requests)
- Response time (p50, p95, p99)
- AI processing time
- JIRA API latency
- Database query time

**Future**: Integration with DataDog, New Relic, or Prometheus

### 13.3 Error Tracking

**Future**: Sentry integration

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://...@sentry.io/...",
    environment="production",
    traces_sample_rate=1.0,
)

# Automatic error capture
try:
    result = await ai_service.extract_request_details(content)
except Exception as e:
    sentry_sdk.capture_exception(e)
    raise
```

---

## Appendix

### A. Development Setup

**Backend**:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python main.py
```

**Frontend**:

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

### B. Testing

**Backend Tests** (Future):

```bash
pytest tests/ -v --cov=app
```

**Frontend Tests** (Future):

```bash
npm run test
npm run test:coverage
```

### C. Database Migrations

**Create Migration**:

```bash
alembic revision -m "add jira metrics table"
```

**Run Migrations**:

```bash
alembic upgrade head
```

### D. API Documentation

**Access Swagger UI**:
```
http://localhost:8000/docs
```

**Access ReDoc**:
```
http://localhost:8000/redoc
```

---

**End of Technical Design Document**
