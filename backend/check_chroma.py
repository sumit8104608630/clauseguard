import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_collection(name="clauses")

print("Total clauses:", collection.count())

data = collection.get(
    include=["documents", "metadatas", "embeddings"]
)

for i, clause_id in enumerate(data["ids"]):
    print("\nClause ID:", clause_id)
    print("Text:", data["documents"][i])
    print("Metadata:", data["metadatas"][i])
    print("Vector dimensions:", len(data["embeddings"][i]))
    print("Vector:", data["embeddings"][i])