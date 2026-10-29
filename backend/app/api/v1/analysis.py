"""/analysis/{contract_id}/run"""
# app/api/v1/analysis.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.contract import Contract, ContractStatus
from app.models.analysis import RiskResult, RiskLevel
from app.models.user import User
from app.api.deps import get_current_user
from app.services.risk_analyzer import analyze_contract_risks
from app.schemas.analysis import AnalysisResponse, RiskScorecard, RiskResultRead

router = APIRouter()

@router.post("/{contract_id}/run", status_code=202)
def run_analysis(
    contract_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify contract belongs to user
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.user_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Flip the status now so the UI starts polling straight away.
    contract.status = ContractStatus.analyzing
    db.commit()

    # Run in background. The task opens its own DB session: FastAPI closes the
    # request-scoped one before background tasks execute.
    background_tasks.add_task(analyze_contract_risks, str(contract.id))
    return {"message": "Analysis started"}

@router.get("/{contract_id}/results", response_model=AnalysisResponse)
def get_analysis_results(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify contract
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.user_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get results
    results = db.query(RiskResult).filter(RiskResult.contract_id == contract_id).all()
    
    # Build the Scorecard
    scorecard = RiskScorecard(high=0, medium=0, low=0, none=0)
    for r in results:
        if r.risk_level == RiskLevel.high: scorecard.high += 1
        elif r.risk_level == RiskLevel.medium: scorecard.medium += 1
        elif r.risk_level == RiskLevel.low: scorecard.low += 1
        elif r.risk_level == RiskLevel.none: scorecard.none += 1

    return {
        "contract_id": contract_id,
        "scorecard": scorecard,
        "results": results
    }