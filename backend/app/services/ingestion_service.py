# app/services/ingestion_service.py
import uuid
import re
import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session
from app.models.contract import Contract, ContractStatus
from app.models.clause import Clause

def download_pdf_from_url(url: str) -> bytes:
    """Downloads the PDF bytes from Cloudinary."""
    response = requests.get(url)
    response.raise_for_status()
    return response.content

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts text from the PDF bytes using PyMuPDF."""
    text = ""
    # Open the PDF from memory
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page in doc:
        text += page.get_text()
    return text
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[dict]:
    """
    A more advanced chunker that identifies section headers (e.g., 'Section 1', 'Article II').
    Returns a list of dictionaries with 'text' and 'label'.
    """
    # Regex to find common section patterns
    section_pattern = re.compile(
        r'(?i)^\s*(?:Section|Article|Clause)\s+([A-Z0-9.\-]+)|^\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s+([A-Z][a-z]+)', 
        re.MULTILINE
    )
    
    chunks = []
    start = 0
    current_label = None
    
    while start < len(text):
        end = start + chunk_size
        chunk_text = text[start:end]
        
        lookback = max(0, start - 200)
        search_area = text[lookback:end]
        matches = list(section_pattern.finditer(search_area))
        
        if matches:
            for match in matches:
                if lookback + match.start() <= start + 100: 
                    full_match = match.group(0).strip()
                    current_label = full_match
        
        # 👇 THE FIX IS HERE 👇
        # If no legal section was found, use a fallback label
        label_to_save = current_label if current_label else f"Chunk {len(chunks) + 1}"
        
        chunks.append({
            "text": chunk_text,
            "label": label_to_save
        })
        
        start += chunk_size - overlap
        
    return chunks

    
def estimate_token_count(text: str) -> int:
    """
    A rough estimation of tokens. 
    For better accuracy, you could use tiktoken: len(encoding.encode(text))
    """
    # Standard heuristic: 1 token is roughly 4 characters or 0.75 words.
    return len(text) // 4
# app/services/ingestion_service.py
# ... (keep existing imports) ...
from app.database import SessionLocal
from app.services.vector_store import add_clauses_to_chroma, delete_contract_clauses

# ... (keep download_pdf_from_url, extract_text_from_pdf, chunk_text) ...
def process_contract_ingestion(contract_id: str):
    """The main pipeline to process a contract.

    Opens its own session: this runs as a FastAPI background task, and
    request-scoped sessions are already closed by the time background tasks
    execute.
    """
    db: Session = SessionLocal()
    try:
        # 1. Fetch the contract from DB
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return

        # 2. Download and extract text
        pdf_bytes = download_pdf_from_url(contract.cloudinary_url)
        raw_text = extract_text_from_pdf(pdf_bytes)

        # 3. Split into chunks
        text_chunks = chunk_text(raw_text)

        # 4. Save chunks to PostgreSQL.
        # Re-processing must replace the previous run, otherwise the old clauses
        # stay behind and duplicate every vector in ChromaDB.
        db.query(Clause).filter(Clause.contract_id == contract.id).delete()
        db.commit()
        delete_contract_clauses(contract.id)

        saved_clauses = []
        for index, chunk_data in enumerate(text_chunks):
            # chroma_id is NOT NULL, so it must be filled in at INSERT time.
            # ChromaDB uses str(clause.id) as its id, so generate the UUID here
            # and mirror it into chroma_id to keep both stores linked.
            clause_id = uuid.uuid4()
            new_clause = Clause(
                id=clause_id,
                contract_id=contract.id,
                chunk_index=index,
                text=chunk_data["text"],
                section_label=chunk_data["label"],
                chroma_id=str(clause_id),
                token_count=estimate_token_count(chunk_data["text"])
            )
            db.add(new_clause)
            saved_clauses.append(new_clause)
        
        # Commit to database to generate the UUIDs for the clauses
        db.commit()
        
        # Refresh objects to ensure we have the generated IDs
        for clause in saved_clauses:
            db.refresh(clause)

        # 5. Save chunks to ChromaDB (Vector Store)
        # Make sure you have created the vector_store_service.py file!
        add_clauses_to_chroma(contract.id, saved_clauses)
        
        # 6. Update Contract Status to "processed"
        contract.status = ContractStatus.processed
        db.commit()
        
        print(f"Successfully processed {len(text_chunks)} chunks for contract {contract.id}")
        
    except Exception as e:
        # If anything fails, mark the contract as failed
        print(f"Error processing contract {contract_id}: {str(e)}")
        # The failed flush leaves the session in "pending rollback" state.
        # Without this, the very next query raises PendingRollbackError
        # and the contract stays stuck on "processing".
        db.rollback()
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if contract:
            contract.status = ContractStatus.failed
            db.commit()
    finally:
        db.close()