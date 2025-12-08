from app.rag.store import rag_store

# Test query to find similar tickets
query = "performance issue with login"
print(f"Query: '{query}'\n")

results = rag_store.query_similar_tickets(query, n_results=3)

print("Top 3 Similar Tickets:")
print("=" * 80)
for i, (doc, metadata, distance) in enumerate(zip(
    results['documents'][0], 
    results['metadatas'][0],
    results['distances'][0] if 'distances' in results else [0]*len(results['documents'][0])
)):
    print(f"\n{i+1}. Ticket ID: {metadata.get('id', 'Unknown')}")
    print(f"   Type: {metadata.get('issuetype', 'Unknown')}")
    print(f"   Status: {metadata.get('status', 'Unknown')}")
    print(f"   Similarity Score: {1 - distance:.4f}" if distance else "   Similarity Score: N/A")
    print(f"   Content: {doc[:150]}...")
