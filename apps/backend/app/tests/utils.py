from datetime import timedelta

from ..core.security import create_access_token, hash_password
from ..models.user_model import Gender, UserRole


def user_sample(email: str = "johndoe@mail.com", username: str = "johndoe",
                password: str = "Test1234!"):
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": email,
        "username": username,
        "password": password,
        "role": UserRole.CHILD.value,
        "phone_number": "+254700123456",
        "date_of_birth": "1985-06-15",
        "gender": Gender.FEMALE.value,
        "background_info": "John is passionate about helping children."
    }


def access_token():
    payload = {
        "username": "janedoe",
        "id": 1,
        "role": UserRole.ADMIN.value,
        "expire": timedelta(hours=1),  # Expiration time (1 hour)
    }

    # Generate an access token
    token = create_access_token(
        user_id=payload["id"],
        username=payload["username"],
        user_role=payload["role"],
        expire=payload["expire"]
    )

    return payload, token
