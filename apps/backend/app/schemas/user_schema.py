from typing import Optional, List
from datetime import date

from pydantic import BaseModel, EmailStr

from ..models.user_model import UserRole, Gender


class UserBase(BaseModel):
    """
    Base schema for user-related operations.

    - Defines common user attributes shared across different schemas.
    - Used as a base class for `UserCreate` and `UserResponse`.

    Attributes:
        - `first_name`: First name of the user.
        - `last_name`: Last name of the user.
        - `role`: User role (Admin, Sponsor, or Child).
        - `is_active`: Account status (defaults to active).
    """
    first_name: str
    last_name: str
    role: UserRole
    is_active: Optional[bool] = True


class UserCreate(UserBase):
    """
    Schema for creating a new user.

    - Inherits common fields from `UserBase`.
    - Includes authentication fields like `username` and `password`.
    - Additional optional fields like email, phone number, and background info.

    Attributes:
        - `username`: Unique username for authentication.
        - `password`: Password for login (should be hashed before storage).
        - `email`: Optional email (validated using `EmailStr`).
        - `phone_number`: Optional phone number.
        - `date_of_birth`: Optional date of birth (for children).
        - `gender`: Optional gender selection.
        - `background_info`: Additional background details.
    """
    username: str
    password: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    background_info: Optional[str] = None

    # Example JSON schema for API documentation
    model_config = {
        "json_schema_extra": {
            "example": {
                "first_name": "Alice",
                "last_name": "Smith",
                "username": "alicesmith",
                "password": "Test1234!",
                "email": "alice@example.com",
                "role": UserRole.SPONSOR.value,
                "phone_number": "+254700123456",
                "date_of_birth": "1985-06-15",
                "gender": Gender.FEMALE.value,
                "background_info": "Alice is passionate about helping children."
            }
        }
    }


class UserResponse(BaseModel):
    """
    Schema for returning user details in API responses.

    - Includes all fields from the SQLAlchemy `User` model except `hashed_password`.
    - Converts database values into structured API responses.

    Attributes:
        - `id`: Unique identifier for the user.
        - `first_name`: User's first name.
        - `last_name`: User's last name.
        - `role`: User's role (Admin, Sponsor, or Child).
        - `username`: Unique username.
        - `email`: Optional email (if provided).
        - `phone_number`: Optional phone number.
        - `date_of_birth`: Optional date of birth (for children).
        - `gender`: Optional gender selection.
        - `background_info`: Additional details for children.
        - `profile_image`: URL of the user's profile picture.
        - `image_gallery`: List of image URLs.
        - `is_active`: Boolean indicating if the user is active.
    """
    id: int
    first_name: str
    last_name: str
    role: UserRole
    username: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    background_info: Optional[str] = None
    profile_image: Optional[str] = None
    image_gallery: Optional[List[str]] = None  # Converts JSON field to List[str]
    is_active: bool

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "first_name": "Alice",
                "last_name": "Smith",
                "role": UserRole.SPONSOR.value,
                "username": "alicesmith",
                "email": "alice@example.com",
                "phone_number": "+254700123456",
                "date_of_birth": "1985-06-15",
                "gender": Gender.FEMALE.value,
                "background_info": "Alice is passionate about helping children.",
                "profile_image": "https://example.com/images/alice.jpg",
                "image_gallery": [
                    "https://example.com/images/alice1.jpg",
                    "https://example.com/images/alice2.jpg"
                ],
                "is_active": True
            }
        }
    }
