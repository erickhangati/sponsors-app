from datetime import date
from pydantic import BaseModel


class SponsorshipBase(BaseModel):
    """
    Base schema for sponsorship-related operations.

    - Defines common attributes shared across different sponsorship schemas.
    - Used as a base class for `SponsorshipResponse` and `SponsorshipUpdate`.

    Attributes:
        - `sponsor_id`: ID of the sponsor.
        - `child_id`: ID of the sponsored child.
        - `start_date`: The date when the sponsorship starts.
        - `status`: Current status of the sponsorship (default is `"active"`).
    """
    sponsor_id: int
    child_id: int
    start_date: date
    status: str = "active"

    # Example JSON schema for API documentation
    model_config = {
        "json_schema_extra": {
            "example": {
                "sponsor_id": 1,
                "child_id": 5,
                "start_date": "2024-03-20",
                "status": "active"
            }
        }
    }


class SponsorshipResponse(SponsorshipBase):
    """
    Schema for returning sponsorship details in API responses.

    - Inherits common fields from `SponsorshipBase`.
    - Includes an additional `id` field for unique identification.

    Attributes:
        - `id`: Unique identifier for the sponsorship.
    """
    id: int

    # Example JSON schema for API documentation
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 10,
                "sponsor_id": 1,
                "child_id": 5,
                "start_date": "2024-03-20",
                "status": "active"
            }
        }
    }


class SponsorshipUpdate(BaseModel):
    """
    Schema for updating sponsorship details.

    - Allows partial updates, meaning all fields are optional.
    - Useful for modifying start date or sponsorship status.

    Attributes:
        - `start_date`: New start date (optional).
        - `status`: Updated sponsorship status (optional).
    """
    start_date: date | None = None
    status: str | None = None

    # Example JSON schema for API documentation
    model_config = {
        "json_schema_extra": {
            "example": {
                "start_date": "2025-04-01",
                "status": "completed"
            }
        }
    }
