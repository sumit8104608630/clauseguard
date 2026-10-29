from pydantic import BaseModel

class ApiResponse(BaseModel):
    status_code: int
    message: str
    data: dict | list | None = None