"""/auth/register, /auth/login"""

# let's create register api 

import http
from typing import Annotated
from app.utils.api_response import ApiResponse
from fastapi import APIRouter,status,HTTPException,Response
from fastapi.params import Depends
from app.schemas.user import UserCreate,UserLogin
from app.utils.api_error import APIError
from app.core.security import hash_password,verify_password,create_jwt_access_token,create_jwt_refresh_token
from app.database import get_db
from app.models.user import User
from app.api.deps import _set_auth_cookies
from sqlalchemy.orm import Session


db_session=Annotated[Session,Depends(get_db)]
router = APIRouter()

# create base url
router.prefix="/user"
router.tags=["user"]

# create the user registration

@router.post("/register",status_code=status.HTTP_201_CREATED)
def register(user:UserCreate,db:db_session):
    """Register a new user."""
    if not all([user.email,user.password,user.full_name]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email, password and full_name are required")
    # let's hash the password 
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email already exists")
    
    hashed_password=hash_password(user.password)
    # let's create the user
    user_db = User(
        email=user.email,
        full_name=user.full_name,
        password=hashed_password,   # column is named "password"
    )
    db.add(user_db)
    db.commit()
    db.refresh(user_db)
    return {
        "id": user_db.id,
        "email": user_db.email,
        "full_name": user_db.full_name,
        "message": "User registered successfully",
    }

# create the login api

@router.post("/login",status_code=status.HTTP_200_OK)
def login(user:UserLogin,db:db_session,response:Response):
    """Login a user."""
    if not all([user.email,user.password]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email and password are required")
    user_db=db.query(User).filter(User.email == user.email).first()
    if not user_db:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is incorrect")
    if not verify_password(user.password,user_db.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="password is incorrect")

    # Reuse the shared helper so login sets the exact same cookie attributes
    # (httponly / secure / samesite / max_age) as the refresh flow in deps.py.
    _set_auth_cookies(response, str(user_db.id))
    return {
        "message": "Login successful",
        "user": {
            "id": str(user_db.id),
            "email": user_db.email,
            "full_name": user_db.full_name,
            "created_at": user_db.created_at,
        },
    }


@router.post("/logout",status_code=status.HTTP_200_OK)
def logout(response:Response):
    """Clear the auth cookies so the user is signed out."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
    
    
    