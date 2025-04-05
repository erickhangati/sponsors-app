import os
from datetime import date

import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine, StaticPool, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from ..core.security import get_current_user, hash_password
from ..database import Base, get_db
from ..main import app
from ..models.user_model import User, Gender, UserRole

load_dotenv()

TEST_DB_URL = os.getenv("TEST_DB_URL")

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False},
                       poolclass=StaticPool)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestSessionLocal()

    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return {
        "id": 1,
        "username": "janedoe",
        "role": UserRole.ADMIN.value
    }


@pytest.fixture
def test_user(request):
    """
    Fixture to create a test user dynamically with a specified role.

    Args:
        request: A pytest request object to allow parameterization.

    Returns:
        Users: A user object for testing.
    """

    # Default to "ADMIN" if no role is specified in the test function
    role = getattr(request, "param", 'admin')

    # Create a test user
    user = User(
        first_name="Jane",
        last_name="Doe",
        email="janedoe@mail.com",
        username="janedoe",
        hashed_password=hash_password("Test1234!"),
        role=role,
        phone_number="+254700123456",
        date_of_birth=date(year=1985, month=1, day=1),
        gender=Gender.FEMALE.value,
        background_info="Jane is passionate about helping children."
    )

    db = TestSessionLocal()
    db.add(user)
    db.commit()

    try:
        yield user  # Provide user object for the test
    finally:
        with engine.connect() as connection:
            connection.execute(text('DELETE FROM users'))  # Cleanup after test
            connection.commit()
            db.close()


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)
