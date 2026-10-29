# app/services/vector_store_service.py
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# 1. Initialize the Embedding Model (downloads on first run)
# all-MiniLM-L6-v2 is small, fast, and perfect for this use case.
print("Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# 2. Initialize ChromaDB (Persistent local storage)
# This creates a folder called 'chroma_db' in your backend directory.
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# 3. Get or Create the Collection
# A collection is like a "table" in PostgreSQL, but for vectors.
clauses_collection = chroma_client.get_or_create_collection(
    name="clauses",
    metadata={"hnsw:space": "cosine"} # Cosine similarity is standard for text
)

def add_clauses_to_chroma(contract_id: str, clauses: list):
    """
    Takes a list of SQLAlchemy Clause objects, generates embeddings, 
    and saves them to ChromaDB.
    """
    if not clauses:
        return

    # Extract text from the clauses
    texts = [clause.text for clause in clauses]
    
    # Generate embeddings (vectors) for all texts at once
    embeddings = embedding_model.encode(texts).tolist()
    
    # Prepare metadata and IDs for ChromaDB
    ids = []
    metadatas = []
    
    for clause in clauses:
        # We use the database UUID as the ChromaDB ID so they stay linked
        ids.append(str(clause.id))
        metadatas.append({
            "contract_id": str(contract_id),
            "chunk_index": clause.chunk_index
        })

    # Add to ChromaDB
    clauses_collection.add(
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )
    print(f"Successfully added {len(texts)} clauses to ChromaDB for contract {contract_id}")


def delete_contract_clauses(contract_id: str):
    """Remove every vector belonging to a contract (used before re-ingesting)."""
    clauses_collection.delete(where={"contract_id": str(contract_id)})