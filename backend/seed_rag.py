from app.rag.store import rag_store

def seed_data():
    print("Seeding RAG data...")
    
    # Seed Architecture Docs
    docs = [
        {
            "id": "doc1",
            "content": "DataOps Architecture: All data pipelines must use Airflow for orchestration. Bronze, Silver, Gold layers are required.",
            "source": "architecture_v1.pdf"
        },
        {
            "id": "doc2",
            "content": "JIRA Guidelines: Bug reports must include steps to reproduce. Stories must have acceptance criteria in Gherkin format.",
            "source": "jira_guidelines.pdf"
        }
    ]
    rag_store.add_documents(docs)
    
    # Seed Past Tickets
    tickets = [
        {
            "id": "JIRA-101",
            "summary": "Fix data ingestion failure in Bronze layer",
            "description": "The daily ingestion job failed due to schema mismatch.",
            "status": "Closed",
            "issuetype": "Bug"
        },
        {
            "id": "JIRA-102",
            "summary": "Implement new customer churn model",
            "description": "Create a new ML model to predict churn using the Gold layer customer table.",
            "status": "In Progress",
            "issuetype": "Story"
        }
    ]
    rag_store.add_jira_tickets(tickets)
    
    print("Seeding complete.")

if __name__ == "__main__":
    seed_data()
