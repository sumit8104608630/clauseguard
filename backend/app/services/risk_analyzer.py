"""Structured LLM risk analysis"""
# app/services/risk_analyzer.py
import uuid
from datetime import datetime, timezone

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.analysis import RiskResult
from app.models.contract import Contract, ContractStatus
from app.schemas.analysis import RiskResultLLM
from app.services.llm_client import get_llm_risk_analysis
from app.services.vector_store import clauses_collection

RISK_CATEGORIES = [
    "Indemnification",
    "Limitation of Liability",
    "Termination",
    "Confidentiality",
    "Payment Terms",
    "IP Ownership",
    "Governing Law",
]


def analyze_contract_risks(contract_id: str):
    """Score every risk category for one contract and persist the findings.

    Opens its own session: this runs as a FastAPI background task, and
    request-scoped sessions are already closed by the time background tasks
    execute.
    """
    db: Session = SessionLocal()
    try:
        contract_uuid = uuid.UUID(str(contract_id))

        contract = db.query(Contract).filter(Contract.id == contract_uuid).first()
        if not contract:
            return

        print(f"Starting risk analysis for contract {contract_uuid}...")

        contract.status = ContractStatus.analyzing
        db.commit()

        # Re-running must not stack a second set of findings on top of the first.
        db.query(RiskResult).filter(RiskResult.contract_id == contract_uuid).delete()
        db.commit()

        findings = 0
        for category in RISK_CATEGORIES:
            # Retrieve only this contract's chunks, closest to the category name.
            results = clauses_collection.query(
                query_texts=[category],
                n_results=3,
                where={"contract_id": str(contract_uuid)},
            )

            if not results["documents"] or not results["documents"][0]:
                continue

            top_clause_ids = results["ids"][0]
            combined_text = "\n\n---\n\n".join(results["documents"][0])

            payload = get_llm_risk_analysis(category, combined_text)

            # Guardrail: the model is asked for strict JSON, but it can still
            # return an unknown risk_level or an out-of-range confidence.
            try:
                verdict = RiskResultLLM.model_validate(payload)
            except ValidationError as exc:
                print(f"Skipping category {category}: invalid LLM payload ({exc.errors()})")
                continue

            db.add(
                RiskResult(
                    contract_id=contract_uuid,
                    clause_id=uuid.UUID(top_clause_ids[0]) if top_clause_ids else None,
                    category=category,
                    risk_level=verdict.risk_level,
                    explanation=verdict.explanation,
                    suggested_fix=verdict.suggested_fix,
                    confidence=verdict.confidence,
                )
            )
            findings += 1

        contract.status = ContractStatus.analyzed
        contract.analyzed_at = datetime.now(timezone.utc)
        db.commit()

        print(f"Finished risk analysis for contract {contract_uuid}: {findings} findings.")

    except Exception as exc:
        print(f"Risk analysis failed for contract {contract_id}: {exc}")
        # The failed flush leaves the session in "pending rollback" state, so
        # roll back before touching the database again.
        db.rollback()
        contract = (
            db.query(Contract)
            .filter(Contract.id == uuid.UUID(str(contract_id)))
            .first()
        )
        if contract:
            contract.status = ContractStatus.failed
            db.commit()
    finally:
        db.close()
