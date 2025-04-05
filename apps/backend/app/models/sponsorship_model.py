from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, Date
from ..database import Base


class Sponsorship(Base):
    """
    Represents a sponsorship relationship between a sponsor and a child.

    - A sponsor (user with role 'sponsor') can sponsor multiple children.
    - A child (user with role 'child') can have multiple sponsors.

    Relationships:
        - Links `sponsor_id` to the `User` table (Sponsor role).
        - Links `child_id` to the `User` table (Child role).
    """
    __tablename__ = "sponsorships"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys linking to the User table
    sponsor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),  # Delete sponsorship if sponsor is removed
        nullable=False
    )
    child_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),  # Delete sponsorship if child is removed
        nullable=False
    )

    start_date = Column(Date, nullable=False)  # Date when the sponsorship started
    status = Column(String, default="active")  # Status of the sponsorship (active, canceled, etc.)

    # Define relationships with User table
    sponsor = relationship(
        "User",
        foreign_keys=[sponsor_id],
        back_populates="sponsorships_as_sponsor"
    )
    child = relationship(
        "User",
        foreign_keys=[child_id],
        back_populates="sponsorships_as_child"
    )
