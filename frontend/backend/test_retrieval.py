from app.rag.store import rag_store

# Test retrieval
print("Testing JIRA ticket retrieval...")
results = rag_store.query_similar_tickets("login page performance issue", n_results=2)
print(f"Found {len(results['documents'][0])} similar tickets:")
for i, doc in enumerate(results['documents'][0]):
    print(f"\n{i+1}. {doc[:100]}...")

print("\n\nTesting document retrieval...")
docs = rag_store.query_docs("bronze silver gold layers", n_results=1)
print(f"Found {len(docs)} relevant documents:")
for i, doc in enumerate(docs):
    print(f"\n{i+1}. {doc[:150]}...")
