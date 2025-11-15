# DataOps JIRA Agent

An intelligent automation platform for DataOps and MLOps teams to streamline JIRA ticket creation from multiple communication channels.

## Features

- **Multi-Channel Monitoring**: Email, Slack, file system integration
- **AI-Powered Extraction**: Local LLM processing for data privacy
- **PII/PHI Detection**: Automatic masking of sensitive information
- **JIRA Integration**: Smart field mapping and ticket creation
- **Pattern Learning**: Continuous improvement from corrections
- **Analytics Dashboard**: Real-time metrics and insights

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Modular Architecture** - Easy to extend and maintain

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Transformers** - Local LLM processing
- **Presidio** - PII/PHI detection
- **ChromaDB** - Vector database for knowledge base
- **Celery + Redis** - Background task processing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (optional, can use SQLite for development)
- Redis (for background tasks)

### Installation

#### 1. Clone the repository
```bash
cd jira-datops-agent
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### 3. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configurations

# Run the server
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### Project Structure

```
jira-datops-agent/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── requests/       # Request queue
│   │   └── connections/    # Integrations
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── layout/         # Layout components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── requests/       # Request components
│   │   └── connections/    # Connection components
│   └── lib/                # Utilities and API client
│       ├── api/            # API client layer
│       ├── types/          # TypeScript types
│       └── utils/          # Helper functions
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # Database models
│   │   └── services/       # Business logic
│   ├── main.py             # Application entry point
│   └── .env.example        # Environment template
│
└── requirements.txt         # Python dependencies
```

## API Integration

The frontend is designed to easily integrate with the backend API. Replace mock data calls in components:

```typescript
// Current (mock data)
const requests = mockRequests;

// Replace with API call
const requests = await api.getRequests();
```

All API endpoints are defined in `frontend/lib/api/client.ts` with TypeScript types.

## Development

### Frontend Development
- Run `npm run dev` in the frontend directory
- Components are hot-reloaded automatically
- Tailwind CSS classes are available throughout

### Backend Development
- Run `python main.py` in the backend directory
- FastAPI auto-reloads on file changes
- API documentation at `http://localhost:8000/docs`

## Configuration

### Frontend
- API URL: Set `NEXT_PUBLIC_API_URL` in `.env.local`

### Backend
- Copy `backend/.env.example` to `backend/.env`
- Configure JIRA, email, Slack credentials
- Set up database connection string

## License

Proprietary - Internal Use Only

## Support

For issues or questions, contact the DataOps team.
