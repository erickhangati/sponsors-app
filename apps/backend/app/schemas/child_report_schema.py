from datetime import date
from typing import Optional
from pydantic import BaseModel


class ChildReportBase(BaseModel):
    """
    Base schema for child reports.

    - Defines attributes shared across different child report schemas.
    - Used as a base class for `ChildReportResponse` and `ChildReportUpdate`.

    Attributes:
        - `child_id`: ID of the child the report is about.
        - `report_date`: Date when the report was recorded.
        - `report_type`: Type of report (e.g., Academic, Health, Other).
        - `details`: Description or observations related to the report.
        - `status`: Read status of the report (default: 'unread').
    """
    child_id: int
    report_date: date
    report_type: str
    details: str
    status: str = "unread"  # Default status

    model_config = {
        "json_schema_extra": {
            "example": {
                "child_id": 5,
                "report_date": "2024-03-15",
                "report_type": "Academic",
                "details": "The child has performed well in school and scored an A grade.",
                "status": "unread"
            }
        }
    }


class ChildReportCreate(ChildReportBase):
    """
    Schema for creating a new child report.

    - Inherits all attributes from `ChildReportBase` without modifications.
    - Used when submitting a new report for a child.
    """
    pass


class ChildReportUpdate(BaseModel):
    """
    Schema for updating an existing child report.

    - Allows partial updates, meaning all fields are optional.

    Attributes:
        - `report_date`: Updated report date (optional).
        - `report_type`: Updated report type (optional).
        - `details`: Updated report details (optional).
        - `status`: Update report status (optional).
    """
    report_date: Optional[date] = None
    report_type: Optional[str] = None  # Academic, Health, Other
    details: Optional[str] = None
    status: Optional[str] = None  # Allow marking as 'read' or 'unread'

    model_config = {
        "json_schema_extra": {
            "example": {
                "report_date": "2024-04-01",
                "report_type": "Academic",
                "details": "Child has shown significant improvement in Math.",
                "status": "read"
            }
        }
    }


class ChildReportResponse(ChildReportBase):
    """
    Schema for returning child report details in API responses.

    - Inherits all attributes from `ChildReportBase`.
    - Includes an additional `id` field for unique identification.

    Attributes:
        - `id`: Unique identifier for the child report.
        - `status`: Read status of the report.
    """
    id: int

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 30,
                "child_id": 5,
                "report_date": "2024-03-15",
                "report_type": "Academic",
                "details": "The child has performed well in school and scored an A grade.",
                "status": "read"
            }
        }
    }
