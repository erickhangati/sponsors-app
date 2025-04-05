from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query, Path
from starlette import status

from ..core.security import user_dependency
from ..database import db_dependency
from ..models.child_report_model import ChildReport
from ..models.user_model import UserRole, User
from ..schemas.child_report_schema import ChildReportResponse, ChildReportCreate, \
    ChildReportUpdate
from ..utils.helpers import get_user_or_404, is_admin, paginate_query
from ..utils.response import create_response

router = APIRouter(tags=["Child Reports"])


@router.post("/reports", response_model=ChildReportResponse,
             status_code=status.HTTP_201_CREATED)
async def create_child_report(
        db: db_dependency,
        logged_in_user: user_dependency,
        report_data: ChildReportCreate):
    """
    Create a new report for a child.

    **Access Control**: Only Admins can create reports.

    **Validation**:
    - Ensures the child exists before creating a report.
    - Uses Pydantic schema for input validation.

    **Database Actions**:
    - Inserts the report into the database.
    - Commits and refreshes the record.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated user details from JWT.
    - report_data (ChildReportCreate): The report details.

    Returns:
    - JSONResponse: Success message with report details.
    """

    # Fetch the logged-in user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only admins can create child reports
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create child reports."
        )

    # Validate that the child exists
    child = db.query(User).filter(User.id == report_data.child_id,
                                  User.role == UserRole.CHILD).first()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found."
        )

    # Create a new child report
    new_report = ChildReport(**report_data.model_dump())

    # Save to database
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Return success response with report details
    return create_response(
        message="Child report created successfully.",
        data=ChildReportResponse.model_validate(new_report).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
        location=f"/users/{new_report.id}"
    )


@router.get("/reports", response_model=List[ChildReportResponse],
            status_code=status.HTTP_200_OK)
async def get_reports(
        db: db_dependency,
        logged_in_user: user_dependency,
        child_id: Optional[int] = Query(None, description="Filter reports by child ID"),
        sponsor_id: Optional[int] = Query(None,
                                          description="Filter reports by sponsor ID"),
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100, description="Max 100 reports per page")
):
    """
    Retrieve child reports.

    **Access Control**:
    - Admins can access all reports.
    - Sponsors can only access reports for their sponsored children.
    - Sponsors & Admins can filter by `child_id`, `sponsor_id`, or both.

    **Query Parameters**:
    - `child_id`: Get reports for a specific child.
    - `sponsor_id`: Get reports for all sponsored children of a sponsor.
    - `both`: Validate the sponsorship relationship before retrieving reports.

    **Pagination**:
        - Implements pagination to limit results per request.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated user details from JWT.
    - child_id (Optional[int]): Child ID filter.
    - sponsor_id (Optional[int]): Sponsor ID filter.
    - page (int): Page number for pagination.
    - page_size (int): Number of reports per page.

    Returns:
    - JSONResponse: Paginated list of child reports.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure at least one filter is provided
    if not child_id and not sponsor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'child_id' or 'sponsor_id' must be provided."
        )

    query = db.query(ChildReport)

    # **Case: Both Child & Sponsor ID provided**
    if child_id and sponsor_id:
        # Validate that the child exists
        child = db.query(User).filter(User.id == child_id,
                                      User.role == UserRole.CHILD).first()
        if not child:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Child not found.")

        # Validate that the sponsor exists
        sponsor = db.query(User).filter(User.id == sponsor_id,
                                        User.role == UserRole.SPONSOR).first()
        if not sponsor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Sponsor not found.")

        # Check if sponsor-child relationship exists
        is_sponsored = any(
            s.sponsor_id == sponsor_id for s in child.sponsorships_as_child)
        if not is_sponsored:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This sponsor does not sponsor the specified child."
            )

        # Ensure only admins or the sponsor can view these reports
        if not is_admin(user) and user.id != sponsor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view these reports."
            )

        # Filter reports for this child under this sponsor
        query = query.filter(ChildReport.child_id == child_id)

    # **Case: Filtering by Child ID Only**
    elif child_id:
        # Validate child exists
        child = db.query(User).filter(User.id == child_id,
                                      User.role == UserRole.CHILD).first()
        if not child:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Child not found.")

        # Ensure the user has permission to access this child's reports
        sponsor_ids = [s.sponsor_id for s in child.sponsorships_as_child]
        if not is_admin(user) and user.id not in sponsor_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this child's reports."
            )

        # Filter reports for this child
        query = query.filter(ChildReport.child_id == child_id)

    # **Case: Filtering by Sponsor ID Only**
    elif sponsor_id:
        # Ensure only admins or the sponsor themselves can access this resource
        if not is_admin(user) and user.id != sponsor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view these reports."
            )

        # Validate that the sponsor exists
        sponsor = db.query(User).filter(User.id == sponsor_id,
                                        User.role == UserRole.SPONSOR).first()
        if not sponsor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Sponsor not found.")

        # Get all children sponsored by this sponsor
        child_ids = [s.child_id for s in sponsor.sponsorships_as_sponsor]
        if not child_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No sponsored children found.")

        # Retrieve reports for all sponsored children
        query = query.filter(ChildReport.child_id.in_(child_ids))

    # **Apply Pagination**
    pagination = paginate_query(query=query, page=page, page_size=page_size)

    # Return error if no reports are found
    if not pagination["results"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No reports found.")

    # Prepare structured response
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_reports": pagination["total_count"],
        "total_pages": pagination["total_pages"],
        "reports": [ChildReportResponse.model_validate(report).model_dump(mode="json") for
                    report in pagination["results"]]
    }

    return create_response(
        message="Reports retrieved successfully.",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.patch("/reports/{report_id}", response_model=ChildReportResponse,
              status_code=status.HTTP_200_OK)
async def update_child_report(
        db: db_dependency,
        logged_in_user: user_dependency,
        report_data: ChildReportUpdate = None,
        report_id: int = Path(gt=0, description="ID of the report to update")):
    """
    Update a child's report.

    **Access Control**:
    - Only Admins can update reports.

    **Behavior**:
    - If a field is provided, it updates that specific field.
    - If no fields are provided, the request is ignored.

    **Validation**:
    - Ensures the report exists before updating.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated user details from JWT.
    - report_data (ChildReportUpdate): Fields to update (optional).
    - report_id (int): ID of the report to update.

    Returns:
    - JSONResponse: Updated report details.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can update reports
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update reports."
        )

    # Fetch the report from the database
    report = db.query(ChildReport).filter(ChildReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )

    # **Apply Partial Updates** (Only update provided fields)
    update_fields = ["report_date", "report_type", "details", "status"]
    for field in update_fields:
        value = getattr(report_data, field, None)
        if value is not None:
            setattr(report, field, value)

    # Commit changes to the database
    db.commit()
    db.refresh(report)

    # Return structured response with updated report
    return create_response(
        message="Report updated successfully.",
        data=ChildReportResponse.model_validate(report).model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )


@router.delete("/reports/{report_id}", status_code=status.HTTP_200_OK)
async def delete_child_report(
        db: db_dependency,
        logged_in_user: user_dependency,
        report_id: int = Path(gt=0, description="ID of the report to delete")):
    """
    Delete a child's report.

    **Access Control**:
    - Only Admins can delete reports.

    **Validation**:
    - Ensures the report exists before deleting.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated user details from JWT.
    - report_id (int): ID of the report to delete.

    Returns:
    - JSONResponse: Confirmation message with deleted report ID.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can delete reports
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete reports."
        )

    # Fetch the report from the database
    report = db.query(ChildReport).filter(ChildReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )

    # Delete the report and commit the transaction
    db.delete(report)
    db.commit()

    # Return structured response
    return create_response(
        message="Report deleted successfully.",
        data={"report_id": report_id},
        status_code=status.HTTP_200_OK
    )


@router.patch("/reports/{report_id}/read", response_model=ChildReportResponse,
              status_code=status.HTTP_200_OK)
async def mark_report_as_read(
        report_id: int,
        db: db_dependency,
        logged_in_user: user_dependency
):
    """
    Mark a child report as read.

    **Access Control**:
    - Admins can mark any report as read.
    - Sponsors can only mark reports of their sponsored children.

    **Database Actions**:
    - Updates the report's status to "read".

    Args:
    - report_id (int): ID of the report to update.
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated user details from JWT.

    Returns:
    - JSONResponse: Success message with updated report details.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Retrieve the report
    report = db.query(ChildReport).filter(ChildReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Report not found.")

    # Retrieve the child associated with the report
    child = db.query(User).filter(User.id == report.child_id,
                                  User.role == UserRole.CHILD).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Associated child not found.")

    # Check permissions: Admins can update any report; Sponsors can only update their sponsored children's reports
    if not is_admin(user) and user.id not in [s.sponsor_id for s in
                                              child.sponsorships_as_child]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to mark this report as read.")

    # Update report status
    report.status = "read"
    db.commit()
    db.refresh(report)

    return create_response(
        message="Report marked as read successfully.",
        data=ChildReportResponse.model_validate(report).model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )
