# app/api/v1/contracts.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status,BackgroundTasks
from sqlalchemy.orm import Session


# app/api/v1/contracts.py

# ... (keep your existing imports) ...
from app.services.ingestion_service import process_contract_ingestion


from app.database import get_db
from app.models.user import User
from app.models.contract import Contract, ContractStatus
from app.schemas.contract import ContractListResponse, ContractRead
from app.api.deps import get_current_user
from app.services.cloudinary_service import upload_contract_to_cloudinary

router = APIRouter(prefix="/contracts", tags=["contracts"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate File Type
    allowed_types = [
        "application/pdf", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed.")
    # 2. Upload to 
    print(file.filename)

    cloudinary_data = upload_contract_to_cloudinary(file)
    print(cloudinary_data)

    # 3. Save to Database
    new_contract = Contract(
        user_id=current_user.id,
        filename=file.filename,
        cloudinary_url=cloudinary_data["url"],
        cloudinary_public_id=cloudinary_data["public_id"],
        file_size=file.size,
        status=ContractStatus.uploaded
    )
    
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    
    return {
        "message": "Contract uploaded successfully", 
        "contract_id": new_contract.id,
        "filename": new_contract.filename
    }

@router.get("/", response_model=ContractListResponse)
def get_my_contracts(
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Calculate offset for pagination
    skip = (page - 1) * size
    
    # Query the DB for this specific user's contracts
    query = db.query(Contract).filter(Contract.user_id == current_user.id)
    total = query.count()
    contracts = query.order_by(Contract.uploaded_at.desc()).offset(skip).limit(size).all()
    
    return {
        "items": contracts,
        "total": total,
        "page": page,
        "size": size,
    }


    

# ... (keep your upload endpoint) ...

@router.post("/{contract_id}/process", status_code=status.HTTP_202_ACCEPTED)
def process_contract(
    contract_id: str,
    background_tasks: BackgroundTasks, # We use background tasks so the API doesn't freeze
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify contract exists and belongs to user
    contract = db.query(Contract).filter(
        Contract.id == contract_id, 
        Contract.user_id == current_user.id
    ).first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # 2. Update status to "processing"
    contract.status = ContractStatus.processing
    db.commit()

    # 3. Trigger the ingestion in the background
    # (Note: In production, you'd use Celery or Redis. For this portfolio project, BackgroundTasks is perfect).
    # The task opens its own session: FastAPI closes the request-scoped one
    # before background tasks execute.
    background_tasks.add_task(process_contract_ingestion, str(contract.id))

    return {"message": "Contract processing started in the background."}

from app.schemas.clause import ClauseRead

@router.get("/{contract_id}/clauses", response_model=list[ClauseRead])
def get_contract_clauses(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, 
        Contract.user_id == current_user.id
    ).first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    return contract.clauses


@router.get("/{contract_id}", response_model=ContractRead)
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a single contract (used by the frontend detail page)."""
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.user_id == current_user.id
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return contract