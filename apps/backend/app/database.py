import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Load environment variables from the .env file
load_dotenv()

# Retrieve the database URL from environment variables
DB_URL = os.getenv("DB_URL")

# Raise an error if the database URL is missing
if not DB_URL:
    raise ValueError("Database URL (DB_URL) is not set in environment variables.")

# Create the database engine (responsible for managing database connections)
engine = create_engine(DB_URL, echo=True)  # `echo=True` logs SQL statements

# Create a session factory for handling database transactions
SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)

# Define a base class for all ORM models
Base = declarative_base()


def get_db():
    """
    Dependency function that provides a database session.

    Yields:
        db (Session): SQLAlchemy database session.

    Ensures proper resource management by closing the session after request completion.
    """
    db = SessionLocal()
    try:
        yield db  # Provide the session for use in request handling
    finally:
        db.close()  # Close the session to free up resources


# Dependency injection for FastAPI routes to access the database session
db_dependency = Annotated[Session, Depends(get_db)]
