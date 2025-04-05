from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from ..database import Base


class Payment(Base):
    """
    Represents a payment transaction made by a sponsor for a child.

    - A sponsor (user with role 'sponsor') makes payments for a child.
    - Payments are linked to both the sponsor and the child.

    Relationships:
        - Links `sponsor_id` to the `User` table (Sponsor role).
        - Links `child_id` to the `User` table (Child role).
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys linking to the User table
    sponsor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        # Delete payment if sponsor is removed
        nullable=False
    )
    child_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),  # Delete payment if child is removed
        nullable=False
    )

    amount = Column(Float, nullable=False)  # Payment amount
    currency = Column(String, default="KSh")  # Default currency is KSh (Kenyan Shilling)
    transaction_id = Column(String, unique=True,
                            nullable=False)  # Unique transaction reference
    payment_method = Column(String,
                            nullable=False)  # Payment method (e.g., Mpesa, PayPal, Stripe)
    status = Column(String,
                    default="completed")  # Payment status (completed, pending, failed)

    payment_date = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)  # Default to current UTC timestamp
    )

    # Define relationships with the User table
    sponsor = relationship(
        "User",
        foreign_keys=[sponsor_id],
        back_populates="payments_as_sponsor"
    )
    child = relationship(
        "User",
        foreign_keys=[child_id],
        back_populates="payments_as_child"
    )
