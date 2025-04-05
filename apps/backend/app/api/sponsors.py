from datetime import date
from typing import List

from fastapi import APIRouter, Query, HTTPException, Path
from starlette import status

from ..core.security import user_dependency
from ..database import db_dependency
from ..models.child_report_model import ChildReport
from ..models.sponsorship_model import Sponsorship
from ..models.user_model import User, UserRole
from ..models.payment_model import Payment
from ..schemas.child_report_schema import ChildReportResponse
from ..schemas.payment_schema import PaymentResponse
from ..schemas.user_schema import UserResponse
from ..utils.helpers import get_user_or_404, paginate_query, is_admin
from ..utils.response import create_response

router = APIRouter(tags=["Sponsors"])


@router.get("/sponsors/children", response_model=dict,
            status_code=status.HTTP_200_OK)
async def get_sponsors_children(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of children per page (max: 100)")):
    sponsor = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Sponsor not found")

    # Query total count of sponsored children
    total_children = (
        db.query(User)
        .join(Sponsorship, User.id == Sponsorship.child_id)
        .filter(Sponsorship.sponsor_id == sponsor.id)
        .count()
    )

    if total_children == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No children sponsored by this sponsor")

    # Calculate pagination offset
    offset = (page - 1) * page_size

    # Fetch paginated children
    sponsored_children = (
        db.query(User)
        .join(Sponsorship, User.id == Sponsorship.child_id)
        .filter(Sponsorship.sponsor_id == sponsor.id)
        .limit(page_size)
        .offset(offset)
        .all()
    )

    # Calculate total pages
    total_pages = (total_children + page_size - 1) // page_size  # Ceiling division

    # Prepare paginated response
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_children": total_children,
        "total_pages": total_pages,
        "children": [UserResponse.model_validate(child).model_dump(mode="json") for child
                     in sponsored_children]
    }

    return create_response(
        message="Sponsored children retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsors/children/{id}", status_code=status.HTTP_200_OK)
async def get_child_details(
        db: db_dependency,
        logged_in_user: user_dependency,
        id: int = Path(gt=0, description="ID of the child")
):
    """
    Retrieve details of a sponsored child.

    **Access Control:**
    - **Admins** can access any child’s details.
    - **Sponsors** can only access children they are sponsoring.

    **Path Parameter:**
    - `id`: The ID of the child to retrieve.

    **Returns:**
    - `200 OK`: Child details.
    - `403 FORBIDDEN`: If the user is not authorized.
    - `404 NOT FOUND`: If the child does not exist.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Fetch child details
    child = db.query(User).filter(User.id == id, User.role == "child").first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Child not found")

    # Check if the user is an admin or a sponsor of this child
    sponsorship = db.query(Sponsorship).filter(Sponsorship.child_id == id).first()
    if not is_admin(user) and (not sponsorship or sponsorship.sponsor_id != user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Calculate age
    today = date.today()
    age = today.year - child.date_of_birth.year - ((today.month, today.day) < (
        child.date_of_birth.month, child.date_of_birth.day))

    # Sponsorship details
    sponsorship_details = None
    if sponsorship:
        duration = (today - sponsorship.start_date).days // 30  # Convert to months
        sponsorship_details = {
            "status": sponsorship.status,
            "start_date": sponsorship.start_date.isoformat(),
            "duration_months": duration
        }

    # Payment history
    payments = db.query(Payment).filter(Payment.child_id == id).all()
    total_amount = sum(payment.amount for payment in payments)
    payment_history = [
        {
            "amount": payment.amount,
            "currency": payment.currency,
            "transaction_id": payment.transaction_id,
            "payment_method": payment.payment_method,
            "status": payment.status,
            "payment_date": payment.payment_date.isoformat()
        }
        for payment in payments
    ]

    # Child reports
    reports = db.query(ChildReport).filter(ChildReport.child_id == id).all()
    report_list = [
        {
            "id": report.id,
            "report_date": report.report_date.isoformat(),
            "report_type": report.report_type,
            "status": report.status,
            "details": report.details
        }
        for report in reports
    ]

    # Construct response
    response_data = {
        "personal_info": {
            "profile_image": child.profile_image,
            "full_name": f"{child.first_name} {child.last_name}",
            "age": age,
            "gender": child.gender.value,  # Assuming Gender is an Enum
            "status": "Active" if child.is_active else "Inactive",
            "background_info": child.background_info,
        },
        "sponsorship_details": sponsorship_details,
        "payment_history": {
            "total_contributed": total_amount,
            "payments": payment_history
        },
        "child_reports": report_list,
        "image_gallery": child.image_gallery or []
    }

    return create_response(
        message="Child details retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsors/payments", status_code=status.HTTP_200_OK)
async def get_sponsor_payments(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100, description="Max 100 payments per page")
):
    """
    Retrieve a paginated list of payments made by the logged-in sponsor.

    **Access Control:**
    - **Only sponsors** can access this route.
    - **Admins** are not allowed since this is specific to sponsor payments.

    **Pagination:**
    - `page`: The current page number.
    - `page_size`: The number of payments per page (max 100).

    **Returns:**
    - `200 OK` with a paginated list of the sponsor's payments.
    - `403 FORBIDDEN` if the user is not a sponsor.
    - `404 NOT FOUND` if no payments exist.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure the user is a sponsor
    if user.role != UserRole.SPONSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sponsors can access this resource."
        )

    # Query payments made by the logged-in sponsor
    query = db.query(Payment).filter(Payment.sponsor_id == user.id)

    # Apply pagination
    pagination = paginate_query(query=query, page=page, page_size=page_size)

    # Ensure payments exist
    if not pagination["results"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payments found."
        )

    # Prepare response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_payments": pagination["total_count"],
        "total_pages": pagination["total_pages"],
        "payments": [PaymentResponse.model_validate(payment).model_dump(mode="json")
                     for payment in pagination["results"]]
    }

    # Return structured response
    return create_response(
        message="Sponsor payments retrieved successfully.",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsors/reports", response_model=List[ChildReportResponse],
            status_code=status.HTTP_200_OK)
async def get_sponsor_reports(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100, description="Max 100 reports per page")
):
    """
    Retrieve reports for children sponsored by the logged-in sponsor.

    **Access Control**:
    - Only Sponsors can access this route.
    - Admins should use the `/reports` route instead.

    **Pagination**:
    - Implements pagination to limit results per request.

    **Returns**:
    - `200 OK` with a paginated list of reports.
    - `403 FORBIDDEN` if the user is not a sponsor.
    - `404 NOT FOUND` if no reports are available.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure user is a Sponsor
    if user.role != UserRole.SPONSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sponsors can access this resource."
        )

    # Get all children sponsored by this sponsor
    child_ids = [s.child_id for s in user.sponsorships_as_sponsor]
    if not child_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sponsored children found."
        )

    # Retrieve reports for all sponsored children
    query = db.query(ChildReport).filter(ChildReport.child_id.in_(child_ids))

    # Apply Pagination
    pagination = paginate_query(query=query, page=page, page_size=page_size)

    # Ensure reports exist
    if not pagination["results"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reports found for your sponsored children."
        )

    # Prepare structured response
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_reports": pagination["total_count"],
        "total_pages": pagination["total_pages"],
        "reports": [ChildReportResponse.model_validate(report).model_dump(mode="json")
                    for report in pagination["results"]]
    }

    return create_response(
        message="Reports retrieved successfully.",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsors/reports/{report_id}", response_model=ChildReportResponse,
            status_code=status.HTTP_200_OK)
async def get_sponsor_report_by_id(
        db: db_dependency,
        logged_in_user: user_dependency,
        report_id: int = Path(..., gt=0, description="ID of the report to retrieve")
):
    """
    Retrieve a specific child report for a sponsor.

    **Access Control**:
    - Only Sponsors can access this route.
    - Sponsor can only access reports for children they sponsor.

    **Returns**:
    - `200 OK` with the report data.
    - `403 FORBIDDEN` if the user is not authorized.
    - `404 NOT FOUND` if the report or child is not found.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure user is a Sponsor
    if user.role != UserRole.SPONSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sponsors can access this resource."
        )

    # Fetch the report
    report = db.query(ChildReport).filter(ChildReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )

    # Check if the sponsor is assigned to this child
    sponsored_child_ids = {s.child_id for s in user.sponsorships_as_sponsor}
    if report.child_id not in sponsored_child_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this report."
        )

    # Return the report
    return create_response(
        message="Report retrieved successfully.",
        data=ChildReportResponse.model_validate(report).model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )
