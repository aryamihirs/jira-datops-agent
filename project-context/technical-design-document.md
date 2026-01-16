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
│                  Hosted on Vercel/Static CDN                 │
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
│              DATABRICKS PLATFORM                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │         DATABRICKS APP (Backend)                         │
│  │                                                           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  │ API Routers  │  │   Services   │  │   AI Agents  │  │
│  │  │  /requests   │  │ JiraService  │  │IntakeRouter  │  │
│  │  │/connections  │  │  AIService   │  │RequestCreator│  │
│  │  │  /knowledge  │  │ParsingService│  │              │  │
│  │  │  /dashboard  │  │              │  │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │
│  └─────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │    DELTA LAKE (Data Storage)                             │
│  │  • requests table                                        │
│  │  • connections table                                     │
│  │  • knowledge_items table                                 │
│  │  • jira_metrics table                                    │
│  │  • ACID transactions, time travel, schema evolution      │
│  └─────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │    AI/BI GENIE (Analytics & Insights)                    │
│  │  • Natural language queries on request data              │
│  │  • Auto-generated dashboards                             │
│  │  • Predictive analytics and forecasting                  │
│  └─────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │    VECTOR SEARCH (RAG System)                            │
│  │  • Native vector embeddings for similar ticket search    │
│  │  • Documentation semantic search                         │
│  │  • Hybrid search (keyword + semantic)                    │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Databricks  │    │    JIRA      │    │   Google     │
│   Volumes    │    │  Connector   │    │ Generative   │
│ (File Store) │    │  (Native)    │    │  AI (Gemini) │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 1.2 Component Responsibilities

#### **Frontend (Next.js + React)**
- User interface and interactions
- Client-side routing (App Router)
- API calls to Databricks App backend
- State management
- Form validation
- Real-time updates (future: WebSockets)

#### **Databricks App (Backend - FastAPI + Python)**
- REST API endpoints hosted on Databricks Apps
- Business logic and orchestration
- Database operations via Delta Lake
- External API integration (JIRA Connector, Google AI)
- Document parsing and file handling
- Authentication & authorization via Databricks workspace

#### **Delta Lake (Data Storage)**
- ACID-compliant data lake storage
- Structured tables (requests, connections, knowledge items, metrics)
- Schema evolution and versioning
- Time travel for audit and recovery
- Optimized parquet format for analytics

#### **Databricks Vector Search (RAG System)**
- Native vector embeddings storage
- Hybrid search (keyword + semantic)
- Similar ticket retrieval
- Documentation semantic search
- Auto-sync with Delta Lake tables

#### **AI/BI Genie (Analytics Layer)**
- Natural language queries on Delta Lake tables
- Auto-generated dashboards and visualizations
- Predictive analytics and forecasting
- Anomaly detection
- Self-service analytics for business users

#### **Databricks JIRA Connector**
- Native JIRA Cloud integration
- Automated data sync from JIRA
- Bi-directional updates
- Field mapping and transformation
- Real-time or scheduled sync

#### **External Services**
- **Google Generative AI**: LLM for request analysis (Gemini 2.0)
- **Databricks Volumes**: File storage for uploaded documents
- **Databricks Workflows**: Background jobs and scheduling

### 1.3 Data Flow

#### **Request Creation Flow**
```
1. User uploads document → Frontend
2. Frontend → POST /api/requests/ → Databricks App
3. Databricks App → ParsingService.parse_document() → Extract text
4. Databricks App → Store file in Databricks Volumes
5. Databricks App → AIService.extract_request_details() → Google Gemini AI
6. AIService → RequestCreatorAgent.create_request() → Field extraction
7. RequestCreatorAgent → RAG query → Databricks Vector Search → Similar tickets
8. Databricks App → Save to Delta Lake → requests table
9. Databricks App → Return request object → Frontend
10. Frontend → Update UI
```

#### **Request Release Flow**
```
1. User clicks "Release" → Frontend
2. Frontend → POST /api/requests/release → Databricks App
3. Databricks App → Fetch JIRA connection → Delta Lake (connections table)
4. Databricks App → JIRA Connector.create_issue() → JIRA API
5. JIRA → Return issue key (PROJ-123)
6. Databricks App → Update request.jira_issue_key → Delta Lake
7. Databricks App → Trigger Databricks Workflow for metrics sync
8. Databricks App → Return result → Frontend
9. Frontend → Update UI with JIRA link
```

#### **JIRA Metrics Sync Flow** (v1.1)
```
1. Databricks Workflow (scheduled every 5 min) → Trigger sync job
2. Job → JIRA Connector → Fetch issue updates from JIRA
3. For each active request:
   a. JIRA Connector → Fetch issue details, changelog, comments
   b. JiraMetricsService → Process changelog → Status transitions
   c. JiraMetricsService → Calculate derived metrics
   d. Save to Delta Lake → jira_metrics, jira_status_history tables
4. AI/BI Genie → Auto-refresh dashboards with latest metrics
5. Frontend → Query /api/jira-metrics/summary → Display on dashboard
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

### 2.2 Databricks Platform

| Technology | Version | Purpose |
|------------|---------|---------|
| **Databricks Apps** | Latest | Host FastAPI backend application |
| **Delta Lake** | Latest | ACID-compliant data lake storage |
| **Databricks Vector Search** | Latest | Native vector embeddings and hybrid search |
| **Databricks AI/BI Genie** | Latest | Natural language analytics and dashboards |
| **Databricks JIRA Connector** | Latest | Native JIRA Cloud integration |
| **Databricks Workflows** | Latest | Scheduled jobs and orchestration |
| **Databricks Volumes** | Latest | File storage for uploaded documents |
| **Unity Catalog** | Latest | Unified governance and metadata management |

### 2.3 Backend (Databricks App)

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.5 | Modern Python web framework |
| **Python** | 3.11+ | Programming language |
| **Pydantic** | 2.10.2 | Data validation |
| **Uvicorn** | 0.32.1 | ASGI server |
| **Delta-Spark** | Latest | Spark connector for Delta Lake |
| **PySpark** | 3.5+ | Data processing and transformations |

### 2.4 AI & Machine Learning

| Technology | Version | Purpose |
|------------|---------|---------|
| **Google Generative AI** | 0.8.0+ | LLM (Gemini 2.0 Flash) |
| **Databricks Vector Search** | Latest | Vector embeddings and similarity search |
| **Google Text Embeddings** | - | Text embeddings (text-embedding-004) |
| **Databricks AI/BI Genie** | Latest | Predictive analytics and forecasting |

### 2.5 Integrations

| Technology | Version | Purpose |
|------------|---------|---------|
| **Databricks JIRA Connector** | Latest | Native JIRA Cloud integration |
| **JIRA Python SDK** | 3.8.0 | JIRA Cloud API client (fallback) |
| **Slack SDK** | 3.33.4 | Slack API (future) |
| **pypdf** | 4.0+ | PDF parsing |
| **python-docx** | 1.1+ | Word document parsing |
| **python-pptx** | 0.6.21 | PowerPoint parsing |

### 2.6 Infrastructure

| Technology | Purpose |
|------------|---------|
| **Databricks Workspace** | Unified development and production environment |
| **Delta Lake Tables** | Production data storage |
| **Databricks Clusters** | Compute resources for backend and jobs |
| **Vercel** | Frontend hosting (static CDN) |
| **Databricks Secrets** | Secure credential management |

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

## 7.4 Leveraging Databricks Platform Features

### 7.4.1 Databricks Apps (Backend Hosting)

**Purpose**: Host the FastAPI backend application within Databricks workspace

**Benefits**:
- Unified platform for code, data, and compute
- Native access to Delta Lake, Vector Search, and Unity Catalog
- Simplified deployment and scaling
- Integrated authentication and authorization
- No need for external serverless hosting

**Architecture**:

```python
# app.py - Databricks App entry point
from fastapi import FastAPI
from databricks import sql
import os

app = FastAPI(title="JIRA DataOps Agent API")

# Access Delta Lake tables directly
def get_requests_from_delta():
    connection = sql.connect(
        server_hostname=os.getenv("DATABRICKS_SERVER_HOSTNAME"),
        http_path=os.getenv("DATABRICKS_HTTP_PATH"),
        access_token=os.getenv("DATABRICKS_TOKEN")
    )

    cursor = connection.cursor()
    cursor.execute("SELECT * FROM main.jira_agent.requests WHERE status = 'Under Review'")
    return cursor.fetchall()

@app.get("/api/requests/")
async def list_requests():
    requests = get_requests_from_delta()
    return {"items": requests}
```

**Deployment**:
```bash
# Deploy to Databricks Apps
databricks apps create \
  --app-name jira-datops-agent \
  --source-code-path ./backend \
  --env-vars DATABASE_URL=<delta-lake-catalog>
```

---

### 7.4.2 Delta Lake (Data Storage)

**Purpose**: ACID-compliant data lake for all application data

**Key Features**:
- **ACID Transactions**: Reliable reads and writes
- **Time Travel**: Query historical versions, audit trail
- **Schema Evolution**: Add/modify columns without breaking changes
- **Optimized Performance**: Parquet format with Z-ordering
- **Unified Batch & Streaming**: Single table for both workloads

**Table Structure**:

```sql
-- Create catalog and schema
CREATE CATALOG IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS main.jira_agent;

-- Requests table
CREATE TABLE IF NOT EXISTS main.jira_agent.requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  summary STRING NOT NULL,
  description STRING,
  status STRING DEFAULT 'Under Review',
  source_tag STRING,
  source_content STRING,
  issue_type STRING,
  priority STRING,
  jira_issue_key STRING,
  confidence_score DOUBLE,
  extracted_fields STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Optimize table for common queries
OPTIMIZE main.jira_agent.requests ZORDER BY (status, created_at);
```

**Time Travel for Audit**:

```sql
-- View historical state of a request
SELECT * FROM main.jira_agent.requests VERSION AS OF 10
WHERE id = 123;

-- View all changes in last 7 days
SELECT * FROM main.jira_agent.requests TIMESTAMP AS OF '2026-01-08'
WHERE id = 123;
```

**Python Access**:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Read from Delta Lake
requests_df = spark.table("main.jira_agent.requests")

# Write to Delta Lake
new_request_df.write \
    .format("delta") \
    .mode("append") \
    .saveAsTable("main.jira_agent.requests")

# Merge (upsert) operation
from delta.tables import DeltaTable

delta_table = DeltaTable.forName(spark, "main.jira_agent.requests")

delta_table.alias("target").merge(
    new_data_df.alias("source"),
    "target.id = source.id"
).whenMatchedUpdateAll() \
 .whenNotMatchedInsertAll() \
 .execute()
```

---

### 7.4.3 Databricks Vector Search (RAG System)

**Purpose**: Native vector embeddings and hybrid search for similar tickets and documentation

**Benefits**:
- Auto-sync with Delta Lake tables (no manual indexing)
- Hybrid search (keyword + semantic)
- Built-in embedding generation
- Integrated with Unity Catalog for governance

**Architecture**:

```
Delta Lake Table → Vector Search Index → Query API
    (Source)         (Auto-Sync)        (Hybrid Search)
```

**Setup**:

```python
from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient()

# Create vector search endpoint
vsc.create_endpoint(
    name="jira-agent-endpoint"
)

# Create vector search index for JIRA tickets
vsc.create_index(
    endpoint_name="jira-agent-endpoint",
    index_name="main.jira_agent.jira_tickets_index",
    source_table_name="main.jira_agent.requests",
    primary_key="id",
    embedding_source_column="description",  # Column to embed
    embedding_model_endpoint="databricks-bge-large-en"  # Databricks-hosted model
)

# Create index for documentation
vsc.create_index(
    endpoint_name="jira-agent-endpoint",
    index_name="main.jira_agent.documentation_index",
    source_table_name="main.jira_agent.knowledge_items",
    primary_key="item_id",
    embedding_source_column="content",
    embedding_model_endpoint="databricks-bge-large-en"
)
```

**Query Similar Tickets**:

```python
# Hybrid search (keyword + semantic)
results = vsc.get_index(
    endpoint_name="jira-agent-endpoint",
    index_name="main.jira_agent.jira_tickets_index"
).similarity_search(
    query_text="Need Q4 sales data for board presentation",
    columns=["id", "summary", "description", "jira_issue_key"],
    num_results=5
)

# Results are ranked by similarity score
for result in results.get('result', {}).get('data_array', []):
    print(f"JIRA Key: {result['jira_issue_key']}, Score: {result['score']}")
```

**Benefits over Pinecone**:
- No external service, all within Databricks
- Auto-sync with Delta Lake (no manual ETL)
- Unified governance with Unity Catalog
- Lower latency (same platform)
- Cost savings (no external API calls)

---

### 7.4.4 AI/BI Genie (Analytics & Insights)

**Purpose**: Natural language queries and auto-generated dashboards for business users

**Key Features**:
- **Natural Language SQL**: Ask questions in English, get SQL queries
- **Auto-Generated Dashboards**: Genie creates visualizations automatically
- **Predictive Analytics**: Forecast request volumes, identify trends
- **Anomaly Detection**: Alert on unusual patterns

**Use Cases**:

#### 1. **Natural Language Queries**

Business users can ask questions directly:

```
User: "Show me all high-priority requests from last week"

Genie generates and executes:
SELECT * FROM main.jira_agent.requests
WHERE priority = 'High'
  AND created_at >= CURRENT_DATE() - INTERVAL 7 DAYS
```

```
User: "What's the average time to resolve requests by issue type?"

Genie generates:
SELECT
  issue_type,
  AVG(time_to_resolve_seconds) / 3600 as avg_hours_to_resolve
FROM main.jira_agent.jira_metrics
GROUP BY issue_type
ORDER BY avg_hours_to_resolve DESC
```

#### 2. **Auto-Generated Dashboards**

Genie automatically creates dashboards based on common questions:

- Request volume trends (daily, weekly, monthly)
- Approval rate by confidence score
- Time to resolve by issue type
- Bottleneck identification (which status has longest duration)
- Requester leaderboard (most active users)

**Dashboard Configuration**:

```sql
-- Genie creates materialized views for fast dashboard queries
CREATE MATERIALIZED VIEW main.jira_agent.request_metrics_mv AS
SELECT
  DATE(created_at) as request_date,
  status,
  issue_type,
  priority,
  COUNT(*) as request_count,
  AVG(confidence_score) as avg_confidence
FROM main.jira_agent.requests
GROUP BY DATE(created_at), status, issue_type, priority;

-- Refresh every 5 minutes
ALTER MATERIALIZED VIEW main.jira_agent.request_metrics_mv
SET TBLPROPERTIES ('pipelines.trigger' = 'every 5 minutes');
```

#### 3. **Predictive Analytics**

Genie can forecast future request volumes:

```
User: "Predict request volume for next month"

Genie uses ML models:
- Historical trends
- Seasonality patterns
- Growth rates
- Output: Forecasted daily request counts with confidence intervals
```

**Python API**:

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Ask Genie a question
response = w.genie.ask_question(
    space_id="<genie-space-id>",
    question="Show me all requests that took longer than 48 hours to resolve"
)

# Genie returns SQL + results
print(response.query)  # Generated SQL
print(response.results)  # Query results
```

---

### 7.4.5 Databricks JIRA Connector

**Purpose**: Native bi-directional integration between Databricks and JIRA Cloud

**Benefits**:
- No custom API code needed for basic operations
- Automated data sync from JIRA to Delta Lake
- Real-time or scheduled sync
- Built-in error handling and retry logic
- Unified governance

**Architecture**:

```
JIRA Cloud ←→ Databricks JIRA Connector ←→ Delta Lake
   (API)         (Native Integration)      (jira_metrics table)
```

**Setup**:

```python
# Configure JIRA Connector in Databricks
from databricks.connect.jira import JIRAConnector

connector = JIRAConnector(
    jira_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=dbutils.secrets.get(scope="jira", key="api_token"),
    project_key="PROJ"
)

# Sync JIRA issues to Delta Lake
connector.sync_issues_to_delta(
    target_table="main.jira_agent.jira_issues",
    jql_filter="project = PROJ AND created >= -30d",
    sync_mode="incremental"  # Only fetch new/updated issues
)
```

**Scheduled Sync with Databricks Workflows**:

```python
# Notebook: sync_jira_metrics.py
# This runs on a schedule to keep metrics up to date

from databricks.jira import JIRAConnector
from pyspark.sql.functions import col, current_timestamp

# Fetch all active requests from Delta Lake
requests_df = spark.table("main.jira_agent.requests") \
    .filter(col("jira_issue_key").isNotNull())

jira_keys = [row.jira_issue_key for row in requests_df.collect()]

# Batch fetch from JIRA
connector = JIRAConnector(...)
jira_data = connector.get_issues(issue_keys=jira_keys, include_changelog=True)

# Process and save to jira_metrics table
metrics_df = process_jira_data(jira_data)
metrics_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("mergeSchema", "true") \
    .saveAsTable("main.jira_agent.jira_metrics")
```

**Workflow Schedule**:

```yaml
# databricks-workflow.yml
name: JIRA Metrics Sync
schedule:
  quartz_cron_expression: "0 */5 * * * ?" # Every 5 minutes
tasks:
  - task_key: sync_jira_metrics
    notebook_task:
      notebook_path: /Workspace/jira-agent/jobs/sync_jira_metrics
      source: WORKSPACE
    cluster_spec:
      cluster_name: jira-sync-cluster
      spark_version: 14.3.x-scala2.12
      node_type_id: i3.xlarge
      num_workers: 1
```

---

### 7.4.6 Databricks Workflows (Background Jobs)

**Purpose**: Orchestrate scheduled jobs and long-running tasks

**Use Cases**:

1. **JIRA Metrics Sync** (every 5 minutes)
2. **Email Monitoring** (every 1 minute)
3. **Knowledge Base Indexing** (on-demand)
4. **Analytics Refresh** (every hour)
5. **Cleanup Old Requests** (daily)

**Example Workflow**:

```python
# Workflow: Email Monitoring and Request Creation
# Runs every minute to check for new emails

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.jobs import Task, NotebookTask

w = WorkspaceClient()

# Define workflow
job = w.jobs.create(
    name="Email Request Monitoring",
    tasks=[
        Task(
            task_key="monitor_email",
            notebook_task=NotebookTask(
                notebook_path="/Workspace/jira-agent/jobs/monitor_email",
                source="WORKSPACE"
            ),
            job_cluster_key="shared-cluster"
        ),
        Task(
            task_key="process_requests",
            depends_on=[{"task_key": "monitor_email"}],
            notebook_task=NotebookTask(
                notebook_path="/Workspace/jira-agent/jobs/process_requests",
                source="WORKSPACE"
            ),
            job_cluster_key="shared-cluster"
        )
    ],
    schedule={"quartz_cron_expression": "0 * * * * ?", "timezone_id": "America/Los_Angeles"}
)
```

**Job Monitoring**:

```python
# Check job status
run = w.jobs.run_now(job_id=job.job_id)

# Monitor run
run_status = w.jobs.get_run(run_id=run.run_id)
print(f"Status: {run_status.state.life_cycle_state}")

# Get run output
if run_status.state.life_cycle_state == "TERMINATED":
    output = w.jobs.get_run_output(run_id=run.run_id)
    print(f"Output: {output}")
```

---

### 7.4.7 Databricks Volumes (File Storage)

**Purpose**: Store uploaded documents (PDFs, Word, PowerPoint) within Databricks

**Benefits**:
- No external storage (S3, Azure Blob) needed
- Integrated with Unity Catalog
- Access control via Databricks permissions
- Versioning and lifecycle management

**Setup**:

```sql
-- Create volume for uploaded documents
CREATE VOLUME IF NOT EXISTS main.jira_agent.uploads;
```

**File Upload**:

```python
from databricks.sdk import WorkspaceClient
import os

w = WorkspaceClient()

# Upload file to Databricks Volume
def upload_document(file_path: str, item_id: str):
    volume_path = f"/Volumes/main/jira_agent/uploads/{item_id}/"

    with open(file_path, 'rb') as f:
        w.files.upload(
            file_path=volume_path + os.path.basename(file_path),
            contents=f.read(),
            overwrite=True
        )

    return volume_path + os.path.basename(file_path)

# Read file from volume
def read_document(volume_path: str):
    file_info = w.files.download(file_path=volume_path)
    return file_info.contents
```

**Access from Spark**:

```python
# Read PDF from volume using Spark
pdf_df = spark.read.format("binaryFile").load("/Volumes/main/jira_agent/uploads/")

# Extract text using UDF
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType

@udf(returnType=StringType())
def extract_pdf_text(binary_content):
    import pypdf
    pdf_reader = pypdf.PdfReader(io.BytesIO(binary_content))
    return "\n".join(page.extract_text() for page in pdf_reader.pages)

pdf_df = pdf_df.withColumn("text", extract_pdf_text("content"))
```

---

### 7.4.8 Unity Catalog (Governance)

**Purpose**: Unified governance for data, AI, and analytics

**Features**:
- Centralized access control
- Data lineage tracking
- Audit logging
- Data discovery
- Credential management

**Security Setup**:

```sql
-- Grant permissions to JIRA Agent service principal
GRANT USE CATALOG ON CATALOG main TO `jira-agent-service-principal`;
GRANT USE SCHEMA ON SCHEMA main.jira_agent TO `jira-agent-service-principal`;
GRANT SELECT, MODIFY ON TABLE main.jira_agent.requests TO `jira-agent-service-principal`;

-- Create read-only user for analytics
GRANT USE CATALOG ON CATALOG main TO `analytics-users`;
GRANT USE SCHEMA ON SCHEMA main.jira_agent TO `analytics-users`;
GRANT SELECT ON ALL TABLES IN SCHEMA main.jira_agent TO `analytics-users`;
```

**Data Lineage**:

Unity Catalog automatically tracks:
- Which tables were read to create jira_metrics
- Which jobs write to requests table
- Which users query knowledge_items
- Full audit trail of all data access

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

### 10.1 Hybrid Deployment (Databricks + Vercel)

```
GitHub Repository
       ↓
   Git Push
       ↓
┌──────────────────────┐         ┌──────────────────────┐
│  Vercel Platform     │         │  Databricks Platform │
├──────────────────────┤         ├──────────────────────┤
│                      │         │                      │
│  Frontend Build:     │         │  Backend Deploy:     │
│  - npm install       │         │  - Databricks App    │
│  - npm run build     │         │  - FastAPI service   │
│  - Deploy to CDN     │  HTTPS  │  - Delta Lake access │
│                      │◄──────►│  - Vector Search     │
│                      │         │  - AI/BI Genie       │
│                      │         │  - JIRA Connector    │
└──────────────────────┘         └──────────────────────┘
       ↓                                   ↓
┌──────────────────────┐         ┌──────────────────────┐
│  Production URLs     │         │  Databricks Resources│
├──────────────────────┤         ├──────────────────────┤
│  Frontend:           │         │  Backend API:        │
│  jira-agent.vercel   │         │  <workspace>.cloud   │
│  .app                │         │  .databricks.com/    │
│                      │         │  apps/jira-agent     │
└──────────────────────┘         │                      │
                                 │  Data:               │
                                 │  Delta Lake tables   │
                                 │  in Unity Catalog    │
                                 └──────────────────────┘
```

### 10.2 Environment Variables

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=https://<workspace>.cloud.databricks.com/apps/jira-agent
```

**Backend (Databricks Secrets)**:
```bash
# Databricks connection (auto-configured in Databricks Apps)
DATABRICKS_SERVER_HOSTNAME=<workspace>.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/<warehouse-id>
DATABRICKS_TOKEN=<service-principal-token>

# Unity Catalog
CATALOG_NAME=main
SCHEMA_NAME=jira_agent

# JIRA (stored in Databricks Secrets)
JIRA_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN={{secrets/jira/api_token}}

# AI Services
GOOGLE_API_KEY={{secrets/ai/google_api_key}}

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### 10.3 Databricks App Configuration

**app.yaml** (Databricks App):

```yaml
# Databricks App configuration
name: jira-datops-agent
display_name: "JIRA DataOps Agent"
description: "AI-powered work intake and JIRA ticket creation"

# Compute configuration
compute:
  cluster_id: <cluster-id>  # Or use SQL Warehouse
  # Alternatively, use serverless compute:
  serverless: true

# Environment variables
env:
  CATALOG_NAME: main
  SCHEMA_NAME: jira_agent
  GOOGLE_API_KEY: "{{secrets/ai/google_api_key}}"
  JIRA_API_TOKEN: "{{secrets/jira/api_token}}"

# Application entry point
entrypoint:
  command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
  working_directory: /backend

# Health check
health_check:
  path: /health
  interval: 30
  timeout: 5
  retries: 3

# Resource limits
resources:
  memory: 4Gi
  cpu: 2

# Permissions
permissions:
  - catalog: main
    schema: jira_agent
    privileges: [SELECT, MODIFY, CREATE]
  - vector_search_endpoint: jira-agent-endpoint
    privileges: [QUERY]
```

**Deployment**:

```bash
# Deploy Databricks App
databricks apps deploy \
  --app-name jira-datops-agent \
  --source-code-path ./backend \
  --config app.yaml

# Check deployment status
databricks apps get --app-name jira-datops-agent

# View logs
databricks apps logs --app-name jira-datops-agent --tail
```

### 10.4 Databricks Workspace Setup

**1. Create Unity Catalog Resources**:

```sql
-- Create catalog and schema
CREATE CATALOG IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS main.jira_agent;

-- Create Delta Lake tables
CREATE TABLE main.jira_agent.requests (...);
CREATE TABLE main.jira_agent.connections (...);
CREATE TABLE main.jira_agent.knowledge_items (...);
CREATE TABLE main.jira_agent.jira_metrics (...);

-- Create volume for file uploads
CREATE VOLUME main.jira_agent.uploads;
```

**2. Setup Vector Search**:

```python
from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient()

# Create endpoint
vsc.create_endpoint(name="jira-agent-endpoint")

# Create indexes
vsc.create_index(
    endpoint_name="jira-agent-endpoint",
    index_name="main.jira_agent.jira_tickets_index",
    source_table_name="main.jira_agent.requests",
    primary_key="id",
    embedding_source_column="description",
    embedding_model_endpoint="databricks-bge-large-en"
)
```

**3. Configure Secrets**:

```bash
# Create secret scope
databricks secrets create-scope --scope jira

# Add JIRA credentials
databricks secrets put --scope jira --key api_token
databricks secrets put --scope jira --key email

# Create AI secrets scope
databricks secrets create-scope --scope ai
databricks secrets put --scope ai --key google_api_key
```

**4. Setup JIRA Connector**:

```python
# Configure in Databricks workspace
from databricks.connect.jira import JIRAConnector

connector = JIRAConnector(
    jira_url="https://company.atlassian.net",
    email=dbutils.secrets.get(scope="jira", key="email"),
    api_token=dbutils.secrets.get(scope="jira", key="api_token"),
    project_key="PROJ"
)

# Test connection
connector.test_connection()
```

**5. Setup Databricks Workflows**:

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.jobs import Task, NotebookTask, CronSchedule

w = WorkspaceClient()

# Create JIRA sync job
job = w.jobs.create(
    name="JIRA Metrics Sync",
    tasks=[
        Task(
            task_key="sync_metrics",
            notebook_task=NotebookTask(
                notebook_path="/Workspace/jira-agent/jobs/sync_jira_metrics",
                source="WORKSPACE"
            )
        )
    ],
    schedule=CronSchedule(
        quartz_cron_expression="0 */5 * * * ?",  # Every 5 minutes
        timezone_id="America/Los_Angeles"
    )
)
```

**6. Setup AI/BI Genie Space**:

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Create Genie space for analytics
genie_space = w.genie.create_space(
    name="JIRA DataOps Analytics",
    description="Natural language analytics for JIRA DataOps Agent",
    tables=[
        "main.jira_agent.requests",
        "main.jira_agent.jira_metrics",
        "main.jira_agent.jira_status_history"
    ]
)
```

### 10.5 Frontend Deployment (Vercel)

**vercel.json** (Frontend):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://<workspace>.cloud.databricks.com/apps/jira-agent"
  }
}
```

**Deploy Frontend**:

```bash
# Deploy to Vercel
cd frontend
vercel deploy --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
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
