"""Retrieval for the contract Q&A chat."""
# app/services/chat.py
import uuid

from app.services.vector_store import clauses_collection

# How many chunks we hand to the LLM as grounding context.
TOP_K = 5


def retrieve_context(contract_id: str, question: str) -> tuple[str, list[uuid.UUID]]:
    if(question == ""):
        return "", []
    
    """Find the chunks most relevant to ``question`` for one contract.
    Returns the concatenated text plus the clause ids that make it up. The ids
    are the clauses actually sent to the LLM, so they are what the UI may
    honestly cite.
    """
    contract_id = str(contract_id)

    # Chroma raises if n_results exceeds the number of matching vectors, so
    # ask for however many this contract actually has.
    existing = clauses_collection.get(where={"contract_id": contract_id}, include=[])
    available = len(existing["ids"])
    if available == 0:
        return "", []

    results = clauses_collection.query(
        query_texts=[question],
        n_results=min(TOP_K, available),
        where={"contract_id": contract_id},
    )

    documents = results["documents"][0] if results["documents"] else []
    if not documents:
        return "", []

    clause_ids = [uuid.UUID(chunk_id) for chunk_id in results["ids"][0]]
    return "\n\n---\n\n".join(documents), clause_ids
