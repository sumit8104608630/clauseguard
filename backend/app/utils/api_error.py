
from pydantic import BaseModel

class APIError(BaseModel):
    code: int
    message: str
    detail: str | None = None
    data: dict | None = None