from enum import Enum
from sqlalchemy.orm import relationship
from sqlalchemy import (
    Column, Integer, String, Enum as SQLAlchemyEnum, Boolean,
    Date, Text, JSON
)
from ..database import Base


# Enum for user roles
class UserRole(str, Enum):
    """
    Defines the different roles a user can have.
    - ADMIN: Full control over the system.
    - SPONSOR: Can sponsor children and make payments.
    - CHILD: Represents a child who can be sponsored.
    """
    ADMIN = "admin"
    SPONSOR = "sponsor"
    CHILD = "child"


# Enum for gender options
class Gender(str, Enum):
    """
    Defines gender options for users.
    """
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class User(Base):
    """
    Represents a user in the system, including Admins, Sponsors, and Children.

    Relationships:
        - Sponsors can sponsor multiple children.
        - Children can have multiple sponsors.
        - Users can make or receive payments.
        - Children can have multiple progress reports.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(SQLAlchemyEnum(UserRole), nullable=False)  # User role

    # Authentication fields
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Common fields for Admins & Sponsors
    email = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, nullable=True)

    # Child-specific fields
    date_of_birth = Column(Date, nullable=True)  # Only applicable for children
    gender = Column(SQLAlchemyEnum(Gender), nullable=True)  # Predefined gender choices
    background_info = Column(Text, nullable=True)  # Additional child details
    profile_image = Column(String, nullable=True)  # Image URL for profile picture
    image_gallery = Column(JSON, nullable=True)  # Stores a list of image URLs

    # Sponsorship relationships
    sponsorships_as_sponsor = relationship(
        "Sponsorship",
        foreign_keys="[Sponsorship.sponsor_id]",
        back_populates="sponsor",
        cascade="all, delete-orphan"
    )
    sponsorships_as_child = relationship(
        "Sponsorship",
        foreign_keys="[Sponsorship.child_id]",
        back_populates="child",
        cascade="all, delete-orphan"
    )

    # Payments relationships
    payments_as_sponsor = relationship(
        "Payment",
        foreign_keys="[Payment.sponsor_id]",
        back_populates="sponsor",
        cascade="all, delete-orphan"
    )
    payments_as_child = relationship(
        "Payment",
        foreign_keys="[Payment.child_id]",
        back_populates="child",
        cascade="all, delete-orphan"
    )

    # Child Reports relationship
    reports = relationship(
        "ChildReport",
        back_populates="child",
        cascade="all, delete-orphan"
    )

    is_active = Column(Boolean, default=True)  # Indicates if user is active
