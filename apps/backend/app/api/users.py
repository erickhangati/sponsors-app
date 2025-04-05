import re
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Path, Query, UploadFile, File, Form
from starlette import status

from ..models.user_model import User, UserRole, Gender
from ..schemas.user_schema import UserCreate, UserResponse
from ..database import db_dependency
from ..core.security import hash_password, user_dependency
from ..utils.helpers import get_user_or_404, is_admin, paginate_query
from ..utils.response import create_response

# Initialize API router with a tag for organization in Swagger docs
router = APIRouter(tags=["Users"])


@router.post("/users",
             response_model=UserResponse,
             status_code=status.HTTP_201_CREATED)
async def create_user(
        db: db_dependency,
        logged_in_user: user_dependency,
        user_data: UserCreate):
    """
    Register a new user.

    - **Requires Admin role**
    - Ensures unique username and email
    - Enforces strong password rules

    Args:
    - db (Session): Database session dependency
    - logged_in_user (dict): Authenticated user details (from JWT token)
    - user_data (UserCreate): User data payload

    Returns:
    - JSONResponse: A response containing the created user's details
    """
    # Check if token is valid
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only an Admin can create new users
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )

    # Check if the username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    # Strong password enforcement pattern:
    # - 8-64 characters
    # - At least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character
    # - No spaces allowed
    password_pattern = (r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)"
                        r"(?=.*[!@#$%^&*()_+={}\[\]:;\"'<>.,?/~`\\|-])[^\s]{8,64}$")

    if not bool(re.match(password_pattern, user_data.password)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be 8-64 chars long, contain 1 uppercase, 1 lowercase, "
                   "1 digit, 1 special character, and no spaces."
        )

    # Create a new user object
    created_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),  # Hash password before storing
        role=user_data.role,
        is_active=user_data.is_active,
        phone_number=user_data.phone_number,
        date_of_birth=user_data.date_of_birth,
        gender=user_data.gender,
        background_info=user_data.background_info
    )

    # Add user to the database
    db.add(created_user)
    db.commit()
    db.refresh(created_user)

    # Format user response
    user_data = UserResponse.model_validate(created_user).model_dump(mode="json")

    return create_response(
        message="User successfully registered",
        data=user_data,
        status_code=status.HTTP_201_CREATED,
        location=f"/users/{created_user.id}"
    )


@router.get("/users", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
async def read_users(
        db: db_dependency,
        logged_in_user: user_dependency,
        first_name: Optional[str] = Query(None, min_length=3,
                                          description="Filter users by first name"),
        last_name: Optional[str] = Query(None, min_length=3,
                                         description="Filter users by last name"),
        role: Optional[UserRole] = Query(None, description="Filter by user role"),
        gender: Optional[Gender] = Query(None, description="Filter by gender"),
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of users per page (max: 100)")
):
    """
    Retrieve a paginated list of users with optional filtering.

    **Access Control:**
    - Only admins can access this endpoint.

    **Args:**
    - db (Session): Database session dependency
    - logged_in_user (dict): Authenticated user details (from JWT token)

    **Filters:**
    - `first_name`: Search users by first name (min length: 3).
    - `last_name`: Search users by last name (min length: 3).
    - `role`: Filter users by role (Admin, Sponsor, Child).
    - `gender`: Filter users by gender (Male, Female, Other).

    **Pagination:**
    - `page`: The page number (default: 1).
    - `page_size`: Number of users per page (default: 10, max: 100).

    **Returns:**
    - A paginated response containing user details.
    """

    # Ensure the logged-in user exists
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Restrict access: Only admins can retrieve users
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )

    # Start building the query
    query = db.query(User)

    # Apply filters if provided
    if first_name:
        query = query.filter(
            User.first_name.ilike(f"%{first_name}%"))  # Case-insensitive search
    if last_name:
        query = query.filter(
            User.last_name.ilike(f"%{last_name}%"))  # Case-insensitive search
    if role:
        query = query.filter(User.role == role)
    if gender:
        query = query.filter(User.gender == gender)

    # Apply pagination
    pagination = paginate_query(query=query, page=page, page_size=page_size)

    # Get total user count (before filtering)
    total_users = db.query(User).count()

    # Prepare response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_users": total_users,  # Total users in the system
        "filtered_user_count": pagination["total_count"],  # Users matching filters
        "total_pages": pagination["total_pages"],
        "users": [UserResponse.model_validate(user).model_dump(mode="json")
                  for user in pagination["results"]]
    }

    # Return structured response
    return create_response(
        message=("Users retrieved successfully"
                 if pagination["total_pages"] > 0 else "No users found"),
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/users/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_logged_in_user(db: db_dependency, logged_in_user: user_dependency):
    """
    Retrieve the profile details of the currently logged-in user.

    **Access Control:**
    - The user must be authenticated.
    - The user can only retrieve their own profile.

    **Returns:**
    - The logged-in user's profile details including ID, name, email, role, etc.
    """

    # Ensure the logged-in user exists
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Convert user data to the response model format
    user_data = UserResponse.model_validate(user).model_dump(mode="json")

    # Return structured response
    return create_response(
        message="User profile retrieved successfully",
        data=user_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/users/{user_id}", response_model=UserResponse,
            status_code=status.HTTP_200_OK)
async def read_user(
        db: db_dependency,
        logged_in_user: user_dependency,
        user_id: int = Path(gt=0, description="User ID (must be greater than 0)")):
    """
    Retrieve the profile details of a specific user by their ID.

    **Access Control:**
    - The requester must be authenticated.
    - Any authenticated user can view another user's profile.

    **Path Parameter:**
    - `user_id` (int): The ID of the user whose profile is being requested.

    **Returns:**
    - The profile details of the requested user, including ID, name, email, role, etc.

    **Raises:**
    - `404 NOT FOUND` if the user does not exist.
    """

    # Ensure the logged-in user exists (prevents reading data with a deleted account)
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'),
                           detail="User no longer exists")

    # Fetch the requested user
    fetched_user = get_user_or_404(db=db, user_id=user_id)

    # If not admin cannot fetch admin account
    if is_admin(fetched_user) and not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to perform this action")

    # Convert user data to the response model format
    user_data = UserResponse.model_validate(fetched_user).model_dump(mode="json")

    # Return structured response
    return create_response(
        message="User profile retrieved successfully",
        data=user_data,
        status_code=status.HTTP_200_OK
    )


@router.put("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_user(
        db: db_dependency,
        logged_in_user: user_dependency,
        user_data: UserCreate,
        user_id: int = Path(gt=0, description="User ID (must be greater than 0)")
):
    """
    Update a user's details. Only admins can perform this action.

    **Access Control:**
    - The requester must be an admin.

    **Path Parameter:**
    - `user_id` (int): The ID of the user to update.

    **Returns:**
    - No content (204) upon successful update.

    **Raises:**
    - `403 FORBIDDEN` if the user is not an admin.
    - `404 NOT FOUND` if the user to update does not exist.
    """

    # Ensure the logged-in user exists and is an admin
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )

    # Fetch the user to update
    user_update = get_user_or_404(db=db, user_id=user_id,
                                  detail="User to update not found")

    # Update user fields dynamically using vars() + setattr()
    update_data = vars(user_data)  # Convert Pydantic model to dictionary
    for field, value in update_data.items():
        if value is not None:  # Ensure only provided fields are updated
            if field == "password":  # Map "password" to "hashed_password"
                value = hash_password(value)
                setattr(user_update, "hashed_password", value)  # Correct field
            else:
                setattr(user_update, field, value)

    # Commit changes to the database
    db.commit()
    db.refresh(user_update)


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
        db: db_dependency,
        logged_in_user: user_dependency,
        user_id: int = Path(gt=0, description="User ID (must be greater than 0)")
):
    """
    Delete a user from the system.

    **Access Control:**
    - Only admins can delete users.
    - Users cannot delete themselves.

    **Path Parameter:**
    - `user_id` (int): The ID of the user to delete.

    **Returns:**
    - `200 OK` with a confirmation message.

    **Raises:**
    - `403 FORBIDDEN` if the user is not an admin.
    - `404 NOT FOUND` if the user does not exist.
    - `400 BAD REQUEST` if the user tries to delete themselves.
    """

    # Ensure the user exists before checking permissions
    user_to_delete = get_user_or_404(db=db, user_id=user_id,
                                     detail="User to delete not found")

    # Fetch the logged-in user for authorization check
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only admins can delete users
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )

    # Prevent self-deletion
    if user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

    # Delete the user and commit the transaction
    db.delete(user_to_delete)
    db.commit()

    return create_response(
        message=f"User with ID {user_id} has been deleted successfully",
        status_code=status.HTTP_200_OK
    )
