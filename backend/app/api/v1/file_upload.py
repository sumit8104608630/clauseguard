

# let's create register api 

import http
from typing import Annotated
from app.utils.api_response import ApiResponse
from fastapi import APIRouter,status,HTTPException,Response
from fastapi.params import Depends
from app.schemas.user import UserCreate,UserLogin
from app.utils.api_error import APIError
from app.database import get_db
from app.models.user import FileUpload
from sqlalchemy.orm import Session