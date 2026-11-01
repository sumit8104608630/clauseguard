# app/services/vector_store_service.py
#
# NOTE ON LAZY LOADING:
# `sentence_transformers` (and its `torch` dependency) plus `chromadb` are very
# heavy to import and initialize. Doing that at module import time means the
# cost is paid while `app.main` is being imported by uvicorn -- i.e. *before*
# the process binds its port. On a slow (0.1 CPU) instance that makes Render's
# port scan time out, so the service is killed before it can serve traffic.
#
# Everything heavy is therefore created on first use via the cached getters
# below, so the app binds its port quickly and pays the cost only when a
# request that actually needs RAG/embeddings arrives.

_embedding_model = None
_chroma_client = None
_clauses_collection = None


def get_embedding_model():
    """Load (once) and return the sentence-transformers embedding model."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        print("Loading embedding model...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def get_clauses_collection():
    """Create (once) and return the persistent ChromaDB collection."""
    global _chroma_client, _clauses_collection
    if _clauses_collection is None:
        import chromadb

        # Persistent local storage: creates a 'chroma_db' folder in the
        # backend working directory.
        _chroma_client = chromadb.PersistentClient(path="./chroma_db")
        # A collection is like a "table" in PostgreSQL, but for vectors.
        # Cosine similarity is standard for text.
        _clauses_collection = _chroma_client.get_or_create_collection(
            name="clauses",
            metadata={"hnsw:space": "cosine"},
        )
    return _clauses_collection


def add_clauses_to_chroma(contract_id: str, clauses: list):
    """
    Takes a list of SQLAlchemy Clause objects, generates embeddings,
    and saves them to ChromaDB.
    """
    if not clauses:
        return

    collection = get_clauses_collection()
    model = get_embedding_model()

    # Extract text from the clauses
    texts = [clause.text for clause in clauses]

    # Generate embeddings (vectors) for all texts at once
    embeddings = model.encode(texts).tolist()

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
    collection.add(
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )
    print(f"Successfully added {len(texts)} clauses to ChromaDB for contract {contract_id}")


def delete_contract_clauses(contract_id: str):
    """Remove every vector belonging to a contract (used before re-ingesting)."""
    get_clauses_collection().delete(where={"contract_id": str(contract_id)})
