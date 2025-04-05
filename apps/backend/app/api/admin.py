from typing import List

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import joinedload, aliased
from starlette import status

from ..core.security import user_dependency
from ..database import db_dependency
from ..models.payment_model import Payment
from ..models.sponsorship_model import Sponsorship
from ..models.user_model import User, UserRole
from ..models.child_report_model import ChildReport
from ..schemas.child_report_schema import ChildReportResponse
from ..schemas.payment_schema import PaymentResponse
from ..schemas.sponsorship_schema import SponsorshipResponse
from ..schemas.user_schema import UserResponse
from ..utils.helpers import get_user_or_404, is_admin
from ..utils.response import create_response

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def get_admin_dashboard(db: db_dependency, logged_in_user: user_dependency):
    """
    Retrieve admin dashboard statistics.

    **Access Control**:
    - Only Admins can access this route.

    **Statistics Retrieved**:
    - Total number of sponsors
    - Total number of children
    - Total number of payments
    - Total amount of all payments

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated admin details from JWT.

    Returns:
    - JSONResponse: A structured response containing dashboard statistics.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    print("====Logged In User===", user.username)

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Query database to retrieve dashboard statistics
    total_sponsors = db.query(User).filter(User.role == UserRole.SPONSOR).count()
    total_children = db.query(User).filter(User.role == UserRole.CHILD).count()
    total_payments = db.query(Payment).count()
    total_amount = db.query(
        func.coalesce(func.sum(Payment.amount), 0)).scalar()  # ✅ Sum of payments

    # Prepare structured dashboard statistics
    dashboard_stats = {
        "total_sponsors": total_sponsors,
        "total_children": total_children,
        "total_payments": total_payments,
        "total_amount": total_amount
    }

    # Return structured response
    return create_response(
        message="Admin dashboard statistics retrieved successfully",
        data=dashboard_stats,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsors", response_model=List[UserResponse],
            status_code=status.HTTP_200_OK)
async def get_all_sponsors(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of sponsors per page (max: 100)")
):
    """
    Retrieve a paginated list of all sponsors.

    **Access Control**:
    - Only Admins can access this route.

    **Pagination**:
    - Default: 10 sponsors per page.
    - Allows admins to retrieve sponsors in a structured way.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated admin details from JWT.
    - page (int): Page number for pagination (default: 1).
    - page_size (int): Number of sponsors per page (default: 10, max: 100).

    Returns:
    - JSONResponse: Paginated list of sponsors.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Get total number of sponsors
    total_sponsors = db.query(User).filter(User.role == UserRole.SPONSOR).count()

    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Query paginated sponsors
    sponsors = (
        db.query(User)
        .filter(User.role == UserRole.SPONSOR)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Calculate total pages
    total_pages = (total_sponsors + page_size - 1) // page_size  # Ceiling division

    # Return an empty list if no sponsors are found
    if not sponsors:
        return create_response(
            message="No sponsors found",
            data=[],
            status_code=status.HTTP_200_OK
        )

    # Prepare structured response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_sponsors": total_sponsors,
        "total_pages": total_pages,
        "sponsors": [UserResponse.model_validate(sponsor).model_dump(mode="json")
                     for sponsor in sponsors]
    }

    # Return the paginated sponsor data
    return create_response(
        message="Sponsors retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/children", response_model=List[UserResponse],
            status_code=status.HTTP_200_OK)
async def get_all_children(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of children per page (max: 100)")
):
    """
    Retrieve a paginated list of all registered children.

    🔹 **Access Control**:
        - Only Admins can access this route.

    🔹 **Pagination**:
        - Default: 10 children per page.
        - Allows admins to retrieve child profiles in a structured way.

    Args:
        db (Session): Database session.
        logged_in_user (dict): Authenticated admin details from JWT.
        page (int): Page number for pagination (default: 1).
        page_size (int): Number of children per page (default: 10, max: 100).

    Returns:
        JSONResponse: Paginated list of children.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Get total number of registered children
    total_children = db.query(User).filter(User.role == UserRole.CHILD).count()

    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Query paginated children
    children = (
        db.query(User)
        .filter(User.role == UserRole.CHILD)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Calculate total pages
    total_pages = (total_children + page_size - 1) // page_size  # Ceiling division

    # Return an empty list if no children are found
    if not children:
        return create_response(
            message="No children found",
            data=[],
            status_code=status.HTTP_200_OK
        )

    # Prepare structured response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_children": total_children,
        "total_pages": total_pages,
        "children": [UserResponse.model_validate(child).model_dump(mode="json") for child
                     in children]
    }

    # Return the paginated child data
    return create_response(
        message="Children retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/payments", response_model=List[PaymentResponse],
            status_code=status.HTTP_200_OK)
async def get_all_payments(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of payments per page (max: 100)")
):
    """
    Retrieve a paginated list of all recorded payment transactions.

    **Access Control**:
    - Only Admins can access this route.

    **Pagination**:
    - Default: 10 payments per page.
    - Allows admins to retrieve payment records in a structured way.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated admin details from JWT.
    - page (int): Page number for pagination (default: 1).
    - page_size (int): Number of payments per page (default: 10, max: 100).

    Returns:
    - JSONResponse: Paginated list of payments.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Get total number of payments
    total_payments = db.query(Payment).count()

    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Query paginated payments
    payments = (
        db.query(Payment)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Calculate total pages
    total_pages = (total_payments + page_size - 1) // page_size  # Ceiling division

    # Return an empty list if no payments are found
    if not payments:
        return create_response(
            message="No payments found",
            data=[],
            status_code=status.HTTP_200_OK
        )

    # Prepare structured response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_payments": total_payments,
        "total_pages": total_pages,
        "payments": [PaymentResponse.model_validate(payment).model_dump(mode="json") for
                     payment in payments]
    }

    # Return the paginated payment data
    return create_response(
        message="Payments retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/sponsorships", status_code=status.HTTP_200_OK)
async def get_all_sponsorships(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of payments per page (max: 100)")
):
    """
    Retrieve a paginated list of all recorded sponsorships.

    **Access Control**:
    - Only Admins can access this route.

    **Pagination**:
    - Default: 10 sponsorships per page.
    - Allows admins to retrieve sponsorship records in a structured way.

    Args:
    - db (Session): Database session.
    - logged_in_user (dict): Authenticated admin details from JWT.
    - page (int): Page number for pagination (default: 1).
    - page_size (int): Number of sponsorships per page (default: 10, max: 100).

    Returns:
    - JSONResponse: Paginated list of sponsorships.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Get total number of sponsorships
    total_sponsorships = db.query(Sponsorship).count()

    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Query paginated sponsorships
    sponsorships = (
        db.query(Sponsorship)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Calculate total pages
    total_pages = (total_sponsorships + page_size - 1) // page_size  # Ceiling division

    # Return an empty list if no payments are found
    if not sponsorships:
        return create_response(
            message="No sponsorships found",
            data=[],
            status_code=status.HTTP_200_OK
        )

    # Prepare structured response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_sponsorships": total_sponsorships,
        "total_pages": total_pages,
        "sponsorships": [SponsorshipResponse.model_validate(sponsorship).model_dump(
            mode="json") for sponsorship in sponsorships]
    }

    # Return the paginated payment data
    return create_response(
        message="Sponsorships retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/child-reports", status_code=status.HTTP_200_OK)
async def get_all_child_reports(
        db: db_dependency,
        logged_in_user: user_dependency,
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of child reports per page (max: 100)")
):
    """
    Retrieve a paginated list of child reports.
    **Only accessible by Admin users.**

    **Access Control:**
    - The requester must be an admin.

    **Query Parameters:**
    - `page` (int): Page number (must be ≥ 1). Defaults to 1.
    - `page_size` (int): Number of child reports per page (must be between 1 and 100). Defaults to 10.

    **Returns:**
    - `200 OK`: A paginated list of child reports, including total count and total pages.
    - If no child reports exist, returns an empty list.

    **Raises:**
    - `403 FORBIDDEN`: If the user is not an admin.
    """

    # Fetch the authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only Admins can access this route
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )

    # Get the total count of child reports in the database
    total_child_reports = db.query(ChildReport).count()

    # Calculate offset for pagination
    offset = (page - 1) * page_size

    # Fetch paginated child reports
    child_reports = (
        db.query(ChildReport)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Calculate the total number of pages (using ceiling division)
    total_pages = (total_child_reports + page_size - 1) // page_size

    # If no child reports exist, return an empty response
    if not child_reports:
        return create_response(
            message="No child reports found",
            data=[],
            status_code=status.HTTP_200_OK
        )

    # Prepare response data
    response_data = {
        "page": page,
        "page_size": page_size,
        "total_child_reports": total_child_reports,
        "total_pages": total_pages,
        "child_reports": [ChildReportResponse.model_validate(child_report).model_dump(
            mode="json") for child_report in child_reports]
    }

    return create_response(
        message="Child reports retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )

