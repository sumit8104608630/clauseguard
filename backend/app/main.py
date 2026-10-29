from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import SessionLocal, Base, engine
from app.models import user,contract,clause,analysis,chat
from app.api.v1 import auth, contracts, analysis, chat

# Schema is now owned by Alembic migrations (`alembic upgrade head`).
# Do NOT call Base.metadata.create_all() here: it bypasses Alembic and, because
# create_all() only ever CREATEs missing tables, it never applies column/table
# changes to an existing database.


app = FastAPI(title="Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contracts.router)
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
