import os
from datetime import timedelta, datetime, timezone
from typing import Annotated, Dict

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from starlette import status
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Initialize bcrypt password hashing context
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dependencies for authentication
token_dependency = Annotated[OAuth2PasswordRequestForm, Depends()]
bearer_dependency = Annotated[str, Depends(OAuth2PasswordBearer(tokenUrl="/auth/login"))]

# Load secret key for JWT signing
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = 'HS256'


def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.

    Args:
        password (str): The plain text password to hash.

    Returns:
        str: The hashed password.
    """
    return bcrypt_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against its hashed version.

    Args:
        plain_password (str): The input password to check.
        hashed_password (str): The stored hashed password.

    Returns:
        bool: True if the passwords match, False otherwise.
    """
    return bcrypt_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, username: str, user_role: str,
                        expire: timedelta) -> str:
    """
    Generates a JWT access token for authentication.

    Args:
        user_id (int): The user's ID.
        username (str): The username of the user.
        user_role (str): The user's role (e.g., admin, sponsor, child).
        expire (timedelta): Token expiration time.

    Returns:
        str: Encoded JWT token.
    """
    expiration_time = datetime.now(timezone.utc) + expire

    # Token payload with user details and expiration time
    payload: Dict[str, str | int | datetime] = {
        "id": user_id,
        "sub": username,
        "role": user_role,
        "exp": expiration_time
    }

    # Encode the JWT token
    token: str = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token


async def get_current_user(request: Request):
    """
    Extracts and verifies the current user from the JWT token in cookies or Authorization header.
    """
    # First try to get token from cookies
    token = request.cookies.get("access_token")

    # If not in cookies, try to get from Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        # Remove 'Bearer ' prefix if present (for cookie case)
        if isinstance(token, str) and token.startswith("Bearer "):
            token = token.split("Bearer ")[1]

        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Extract user details
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        role: str = payload.get("role")

        if not user_id or not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        return {"id": user_id, "username": username, "role": role}

    except JWTError as e:
        print("JWT Error:", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# Dependency to get the authenticated user's details
user_dependency = Annotated[dict, Depends(get_current_user)]
