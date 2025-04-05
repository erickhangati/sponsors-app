from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette import status

from ..core.security import token_dependency, create_access_token, verify_password, \
    user_dependency
from ..database import db_dependency
from ..models.user_model import User
from ..schemas.token_schema import Token

router = APIRouter(tags=["Auth"])

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.post("/auth/login", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")  # Max 5 login attempts per minute per IP
async def create_token(request: Request, response: Response, db: db_dependency,
                       user_request: token_dependency, ):
    """
    Authenticates a user and generates an access token.

    Args:
    - request (Request): The FastAPI request object (required for rate limiting).
    - db (Session): Database session dependency.
    - user_request (UserLoginRequest): Pydantic model with username and password.

    Returns:
        dict: JSON response containing the access token and token type.

    Raises:
        HTTPException: If the user is not found or the password is incorrect.
    """

    # Fetch the user by username
    user = db.query(User).filter(User.username == user_request.username).first()

    # Check if the user exists
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User not found")

    # Verify password using bcrypt
    if not verify_password(user_request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect password")

    # Generate JWT access token with a 60-minute expiration
    token = create_access_token(user_id=user.id, username=user.username,
                                user_role=user.role, expire=timedelta(days=7))

    response.set_cookie(key="access_token", value=f"Bearer {token}", httponly=True)

    # Return authentication status instead of the token
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "access_token": token
    }