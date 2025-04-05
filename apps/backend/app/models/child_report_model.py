from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Text, Enum
from ..database import Base


class ChildReport(Base):
    """
    Represents a report detailing a child's progress or status.

    - Each report is linked to a child.
    - Admins can add reports regarding a child's academic, health, or other progress.
    - Reports can be viewed by sponsors and admins.
    - Reports have a 'status' field indicating whether they have been read.

    Relationships:
        - Links `child_id` to the `User` table (Child role).
    """
    __tablename__ = "child_reports"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key linking to the User table (Child role)
    child_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),  # Delete reports if child is removed
        nullable=False
    )

    report_date = Column(Date, nullable=False)  # Date when the report was created
    report_type = Column(String,
                         nullable=False)  # Type of report (e.g., Academic, Health, Other)
    details = Column(Text, nullable=False)  # Detailed content of the report

    # New field to track if a report has been read
    status = Column(Enum("unread", "read", name="report_status"), default="unread",
                    nullable=False)

    # Define relationship with the User table
    child = relationship(
        "User",
        foreign_keys=[child_id],
        back_populates="reports"
    )
