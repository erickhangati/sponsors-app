import pytest
from starlette import status

from .conftest import client, TestSessionLocal, test_user
from .utils import user_sample, access_token
from ..models.user_model import User, UserRole


def test_create_user(test_user):
    """
    Test the user registration endpoint.

    This test ensures that a new user can be successfully created
    and stored in the database.

    Steps:
    1. Define a new user payload.
    2. Send a POST request to register the user.
    3. Assert that the response status is 201 CREATED.
    4. Assert that the response contains a success message and user data.
    5. Query the database to verify that the user was stored correctly.
    """

    # New user payload
    user = user_sample()

    # Generate an access token for the test user
    _, token = access_token()

    # Send a POST request to create the user
    response = client.post('/users', headers={'Authorization': f'Bearer {token}'},
                           json=user)

    print(f"Response is: {response.json()}")

    # Assertions for response validation
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["message"] == "User successfully registered"
    assert "data" in response.json()

    # Validate that the user exists in the database
    db = TestSessionLocal()
    created_user = db.query(User).filter_by(username="johndoe").first()
    assert created_user is not None
    assert created_user.first_name == "John"
    db.close()


def test_create_user_exists(test_user):
    """
    Test duplicate user registration.

    This test ensures that attempting to register with an already existing
    email or username results in a 400 BAD REQUEST error.

    Steps:
    1. Define a user payload where the email already exists in the database.
    2. Send a POST request to register the user.
    3. Assert that the response status is 400 BAD REQUEST.
    """

    # Generate an access token for the test user
    _, token = access_token()

    # User payload with an already existing email
    user = user_sample(email="janedoe@mail.com", username="janedoe")

    # Send a POST request to register the user
    response = client.post('/users', headers={'Authorization': f'Bearer {token}'},
                           json=user)

    # Assertions for response validation
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email or username already registered"


@pytest.mark.parametrize("test_user", ['child'], indirect=True)
def test_create_user_not_admin(test_user):
    # Generate an access token for the test user
    payload, token = access_token()
    print(payload)
    print(test_user)

    # User payload with an already existing email
    user = user_sample()

    # Send a POST request to register the user
    response = client.post('/users', headers={'Authorization': f'Bearer {token}'},
                           json=user)
    assert response.status_code == status.HTTP_403_FORBIDDEN, \
        f"Expected 403, but got {response.status_code}"
