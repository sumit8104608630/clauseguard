"""/chat/{contract_id} (SSE stream)"""
# app/api/v1/chat.py
import json
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.chat import ChatMessage, MessageRole
from app.models.contract import Contract
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.chat import ChatMessageRead, ChatRequest
from app.services.chat import retrieve_context
from app.services.llm_client import stream_chat_response

router = APIRouter()

# A greeting carries no question, so there is nothing to retrieve. Answering it
# from the model would burn a call and invite an invented reply, so we answer it
# directly. Anchored to the whole message, so "hii, what are the risks?" still
# goes through retrieval normally.
GREETING_PATTERN = re.compile(
    r"^(?:hi+|hey+|hello+|hlo|helo|yo|hola|namaste)"
    r"[\s!.,?]*$",
    re.IGNORECASE,
)

GREETING_REPLY = (
    "Hii i am a contract analyzer i can help you to analyze the contract"
)


def _sse(payload: dict) -> str:
    """Encode one Server-Sent Events frame."""
    return f"data: {json.dumps(payload)}\n\n"


def _persist_exchange(
    contract_id: str,
    user_id: str,
    question: str,
    answer: str,
    clause_ids: list[uuid.UUID],
) -> None:
    """Store both sides of a finished exchange.

    Both rows land together, so history never holds a question with no answer.
    """
    db = SessionLocal()
    try:
        db.add(
            ChatMessage(
                contract_id=uuid.UUID(contract_id),
                user_id=uuid.UUID(user_id),
                role=MessageRole.user,
                content=question,
                cited_clause_ids=[],
            )
        )
        db.add(
            ChatMessage(
                contract_id=uuid.UUID(contract_id),
                user_id=uuid.UUID(user_id),
                role=MessageRole.assistant,
                content=answer,
                cited_clause_ids=clause_ids,
            )
        )
        db.commit()
    finally:
        db.close()


def _event_stream(contract_id: str, user_id: str, question: str):
    """Stream the answer as SSE frames, then persist the exchange.

    Opens its own session: this generator outlives the request-scoped one.
    """
    if GREETING_PATTERN.match(question):
        # Answered here rather than by the model: there is no question to ground.
        yield _sse({"type": "token", "content": GREETING_REPLY})
        _persist_exchange(contract_id, user_id, question, GREETING_REPLY, [])
        yield _sse({"type": "done"})
        return

    context, clause_ids = retrieve_context(contract_id, question)

    if not context:
        yield _sse(
            {
                "type": "error",
                "message": (
                    'This contract has no extracted clauses yet. Use "Process '
                    'contract" first, then ask again.'
                ),
            }
        )
        return

    # Send the grounding clauses up front so the UI can label the answer while
    # it is still arriving.
    yield _sse({"type": "citations", "clause_ids": [str(cid) for cid in clause_ids]})

    answer_parts: list[str] = []
    try:
        for token in stream_chat_response(question, context):
            answer_parts.append(token)
            yield _sse({"type": "token", "content": token})
    except Exception as exc:
        yield _sse({"type": "error", "message": f"The model call failed: {exc}"})
        return

    answer = "".join(answer_parts).strip()
    if not answer:
        yield _sse({"type": "error", "message": "The model returned an empty answer."})
        return

    _persist_exchange(contract_id, user_id, question, answer, clause_ids)
    yield _sse({"type": "done"})


@router.post("/{contract_id}")
def chat_with_contract(
    contract_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
    """Stream an answer grounded in this contract's clauses."""
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.user_id == current_user.id,
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return StreamingResponse(
        _event_stream(str(contract.id), str(current_user.id), request.question),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{contract_id}/history", response_model=list[ChatMessageRead])
def get_chat_history(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return this user's stored conversation for a contract, oldest first."""
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.user_id == current_user.id,
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return (
        db.query(ChatMessage)
        .filter(
            ChatMessage.contract_id == contract_id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
