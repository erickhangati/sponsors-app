from typing import Optional
from datetime import datetime

from pydantic import BaseModel


class PaymentBase(BaseModel):
    """
    Base schema for payment-related operations.

    - Defines common attributes shared across different payment schemas.
    - Used as a base class for `PaymentResponse` and `PaymentUpdate`.

    Attributes:
        - `sponsor_id`: ID of the sponsor making the payment.
        - `child_id`: ID of the sponsored child receiving the benefit.
        - `amount`: Amount paid.
        - `currency`: Currency type (default is `"KES"`).
        - `transaction_id`: Unique transaction identifier.
        - `payment_method`: Payment method used (e.g., Mpesa, PayPal, Stripe).
        - `status`: Payment status (default is `"completed"`).
        - `payment_date`: Date and time of the payment (optional).
    """
    sponsor_id: int
    child_id: int
    amount: float
    currency: str = "KSh"
    transaction_id: str
    payment_method: str  # Mpesa, PayPal, Stripe, etc.
    status: str = "completed"
    payment_date: Optional[datetime] = None  # Can be assigned later

    # Example JSON schema for API documentation
    model_config = {
        "json_schema_extra": {
            "example": {
                "sponsor_id": 1,
                "child_id": 2,
                "amount": 5000.0,
                "currency": "KSh",
                "transaction_id": "TXN123456",
                "payment_method": "Mpesa",
                "status": "completed",
                "payment_date": "2024-03-16T12:00:00Z"
            }
        }
    }


class PaymentCreate(PaymentBase):
    """
    Schema for creating a new payment.

    - Inherits all attributes from `PaymentBase` without modifications.
    - Used when recording new payments.
    """
    pass


class PaymentUpdate(BaseModel):
    """
    Schema for updating an existing payment.

    - Allows partial updates, meaning all fields are optional.

    Attributes:
        - `amount`: Updated payment amount (optional).
        - `currency`: Updated currency type (optional).
        - `transaction_id`: Updated transaction ID (optional).
        - `payment_method`: Updated payment method (optional).
        - `status`: Updated payment status (optional).
        - `payment_date`: Updated payment date (optional).
    """
    amount: Optional[float] = None
    currency: Optional[str] = None
    transaction_id: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[datetime] = None

    # Example JSON schema for API documentation
    model_config = {
        "json_schema_extra": {
            "example": {
                "amount": 2000.50,
                "currency": "KSh",
                "transaction_id": "TXN123456",
                "payment_method": "Mpesa",
                "status": "completed",
                "payment_date": "2024-03-22T12:00:00Z"
            }
        }
    }


class PaymentResponse(PaymentBase):
    """
    Schema for returning payment details in API responses.

    - Inherits all attributes from `PaymentBase`.
    - Includes an additional `id` field for unique identification.

    Attributes:
        - `id`: Unique identifier for the payment.
    """
    id: int

    # Example JSON schema for API documentation
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 20,
                "sponsor_id": 1,
                "child_id": 2,
                "amount": 5000.0,
                "currency": "KSh",
                "transaction_id": "TXN123456",
                "payment_method": "Mpesa",
                "status": "completed",
                "payment_date": "2024-03-16T12:00:00Z"
            }
        }
    }
