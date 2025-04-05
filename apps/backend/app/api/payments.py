from datetime import timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Path
from starlette import status

from ..core.security import user_dependency
from ..database import db_dependency
from ..models.payment_model import Payment
from ..models.sponsorship_model import Sponsorship
from ..models.user_model import User, UserRole
from ..schemas.payment_schema import PaymentResponse, PaymentCreate, PaymentUpdate
from ..utils.helpers import get_user_or_404, is_admin, paginate_query, get_payment_or_404
from ..utils.response import create_response

router = APIRouter(tags=["Payments"])


@router.post("/payments", response_model=PaymentResponse,
             status_code=status.HTTP_201_CREATED)
async def create_payment(db: db_dependency, logged_in_user: user_dependency,
                         payment_data: PaymentCreate):
    """
    Create a new payment record.

    **Access Control:**
    - Only **admins** or the **sponsor making the payment** can perform this action.

    **Validations:**
    - The **sponsor and child** must exist.
    - There must be an **active sponsorship** between them.
    - The **transaction ID must be unique**.

    **Path Parameter:**
    - `payment_data` (PaymentCreate): Contains payment details.

    **Returns:**
    - `201 CREATED` with the payment details.

    **Raises:**
    - `403 FORBIDDEN` if the user is not authorized.
    - `404 NOT FOUND` if the sponsor or child does not exist.
    - `400 BAD REQUEST` if there is no active sponsorship or a duplicate transaction ID.
    """

    # Fetch the authenticated user from the database
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only an admin or the actual sponsor can create a payment
    if not is_admin(user) and user.id != payment_data.sponsor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create this payment."
        )

    # Validate if the sponsor exists and has the correct role
    sponsor = db.query(User).filter(User.id == payment_data.sponsor_id,
                                    User.role == UserRole.SPONSOR).first()
    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Sponsor not found")

    # Validate if the child exists and has the correct role
    child = db.query(User).filter(User.id == payment_data.child_id,
                                  User.role == UserRole.CHILD).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Child not found")

    # Check if there is an active sponsorship between the sponsor and child
    sponsorship = db.query(Sponsorship).filter(
        Sponsorship.sponsor_id == payment_data.sponsor_id,
        Sponsorship.child_id == payment_data.child_id,
        Sponsorship.status == "active"  # Ensures the sponsorship is not canceled
    ).first()

    if not sponsorship:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active sponsorship found between the sponsor and child. "
                   "Create sponsorship first."
        )

    # Ensure the transaction ID is unique
    existing_payment = db.query(Payment).filter(
        Payment.transaction_id == payment_data.transaction_id).first()
    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction ID already exists"
        )

    # Create and save the new payment record
    new_payment = Payment(**payment_data.model_dump())

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    # Return structured response with the created payment details
    return create_response(
        message="Payment recorded successfully",
        data=PaymentResponse.model_validate(new_payment).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
        location=f"/payments/{new_payment.id}"
    )


@router.get("/payments", status_code=status.HTTP_200_OK)
async def get_payments(
        db: db_dependency,
        logged_in_user: user_dependency,
        sponsor_id: Optional[int] = Query(None, description="ID of the sponsor"),
        child_id: Optional[int] = Query(None, description="ID of the child"),
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100, description="Max 100 payments per page")
):
    """
    Retrieve a paginated list of payments.

    **Access Control:**
    - **Admins** can fetch payments for any sponsor or child.
    - **Sponsors** can fetch only their payments.
    - **Sponsors of a child** can fetch payments made for that child.

    **Filtering Options:**
    - `sponsor_id`: Retrieve payments made by a specific sponsor.
    - `child_id`: Retrieve payments received by a specific child.
    - If both `sponsor_id` and `child_id` are provided, it ensures a sponsorship relationship exists.

    **Pagination:**
    - `page`: The current page number.
    - `page_size`: The number of payments per page (max 100).

    **Returns:**
    - `200 OK` with a paginated list of payments.
    - `400 BAD REQUEST` if no filter (`sponsor_id` or `child_id`) is provided.
    - `403 FORBIDDEN` if the user lacks permission.
    - `404 NOT FOUND` if the requested payments, sponsor, or child do not exist.
    """

    # Fetch authenticated user from the database
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure that at least one filter (`sponsor_id` or `child_id`) is provided
    if sponsor_id is None and child_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'sponsor_id' or 'child_id' must be provided."
        )

    # Initialize the base query
    query = db.query(Payment)

    # If filtering by sponsor
    if sponsor_id:
        # Validate that the sponsor exists
        sponsor = db.query(User).filter(User.id == sponsor_id,
                                        User.role == UserRole.SPONSOR).first()
        if not sponsor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sponsor not found"
            )

        # Ensure only admins or the actual sponsor can access their payments
        if not is_admin(user) and user.id != sponsor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        # Apply filter for sponsor payments
        query = query.filter(Payment.sponsor_id == sponsor_id)

    # If filtering by child
    if child_id:
        # Validate that the child exists
        child = db.query(User).filter(User.id == child_id,
                                      User.role == UserRole.CHILD).first()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found"
            )

        # Fetch all sponsors linked to the child through active sponsorships
        sponsor_ids = [s.sponsor_id for s in child.sponsorships_as_child]

        # Ensure only admins or the child's sponsors can access their payments
        if not is_admin(user) and user.id not in sponsor_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        # If filtering by both sponsor and child, ensure they have an active sponsorship
        if sponsor_id:
            sponsorship_exists = db.query(Sponsorship).filter(
                Sponsorship.sponsor_id == sponsor_id,
                Sponsorship.child_id == child_id
            ).first()

            if not sponsorship_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No sponsorship relationship exists between the sponsor and child."
                )

            # Apply filters for both sponsor and child
            query = query.filter(Payment.sponsor_id == sponsor_id,
                                 Payment.child_id == child_id)
        else:
            # Apply filter for child payments
            query = query.filter(Payment.child_id == child_id)

    # Apply pagination
    pagination = paginate_query(query=query, page=page, page_size=page_size)

    # Ensure payments exist
    if not pagination["results"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payments found"
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
        message="Payments retrieved successfully",
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.get("/payments/{payment_id}", response_model=PaymentResponse,
            status_code=status.HTTP_200_OK)
async def get_payment(
        db: db_dependency,
        logged_in_user: user_dependency,
        payment_id: int = Path(gt=0, description="ID of the payment")):
    """
    Retrieve details of a specific payment.

    **Access Control:**
    - **Admins** can fetch any payment.
    - **Sponsors** can only fetch their own payments.
    - **Sponsors of a child** can fetch payments made for that child.

    **Path Parameter:**
    - `payment_id`: The ID of the payment to be retrieved.

    **Returns:**
    - `200 OK`: Payment details.
    - `403 FORBIDDEN`: If the user is not authorized.
    - `404 NOT FOUND`: If the payment, sponsor, or child does not exist.
    """

    # Fetch authenticated user from the database
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Retrieve the payment from the database
    payment = get_payment_or_404(db=db, payment_id=payment_id)

    # Fetch sponsor and child details related to the payment
    sponsor = get_user_or_404(db=db, user_id=payment.sponsor_id)
    child = get_user_or_404(db=db, user_id=payment.child_id)

    # Ensure only admins, the sponsor, or the child can access this payment
    if not is_admin(user) and user.id not in [payment.sponsor_id, payment.child_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this payment."
        )

    # Prepare response data
    payment_details = {
        "id": payment.id,
        "sponsor": {
            "id": sponsor.id,
            "first_name": sponsor.first_name,
            "last_name": sponsor.last_name,
            "email": sponsor.email
        },
        "child": {
            "id": child.id,
            "first_name": child.first_name,
            "last_name": child.last_name,
            "date_of_birth": child.date_of_birth.isoformat() if child.date_of_birth else None
        },
        "amount": payment.amount,
        "currency": payment.currency,
        "transaction_id": payment.transaction_id,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "payment_date": payment.payment_date.isoformat()
    }

    # Return structured response
    return create_response(
        message="Payment retrieved successfully",
        data=payment_details,
        status_code=status.HTTP_200_OK
    )


@router.patch("/payments/{payment_id}", response_model=PaymentResponse,
              status_code=status.HTTP_200_OK)
async def update_payment(
        db: db_dependency,
        logged_in_user: user_dependency,
        payment_data: PaymentUpdate,
        payment_id: int = Path(gt=0, description="ID of the payment")):
    """
    Update payment details.

    **Access Control:**
    - **Only Admins** can update payment records.

    **Path Parameter:**
    - `payment_id`: The ID of the payment to update.

    **Request Body (`PaymentUpdate`):**
    - `amount` (Optional[float]): Updated payment amount.
    - `currency` (Optional[str]): Updated currency (e.g., "KES").
    - `transaction_id` (Optional[str]): Updated transaction ID (must be unique).
    - `payment_method` (Optional[str]): Updated payment method (Mpesa, PayPal, etc.).
    - `status` (Optional[str]): Updated status (e.g., "completed", "pending").
    - `payment_date` (Optional[datetime]): Updated payment date (UTC).

    **Returns:**
    - `200 OK`: Successfully updated payment.
    - `400 BAD REQUEST`: If transaction ID is already in use.
    - `403 FORBIDDEN`: If the user is not an admin.
    - `404 NOT FOUND`: If the payment does not exist.
    """

    # Fetch authenticated user from the database
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only admins can update payments
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update payment details."
        )

    # Retrieve the payment from the database
    payment = get_payment_or_404(db=db, payment_id=payment_id)

    # Check if the new transaction ID already exists (to prevent duplicates)
    if payment_data.transaction_id:
        existing_payment = db.query(Payment).filter(
            Payment.transaction_id == payment_data.transaction_id,
            Payment.id != payment_id  # Exclude the current payment from the check
        ).first()
        if existing_payment:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Transaction ID already exists")

    # Dynamically update only provided fields
    update_fields = ["amount", "currency", "transaction_id", "payment_method", "status",
                     "payment_date"]
    for field in update_fields:
        value = getattr(payment_data, field)
        if value is not None:
            setattr(payment, field, value if field != "payment_date" else value.replace(
                tzinfo=timezone.utc))  # Ensure UTC timezone consistency

    # Commit changes and refresh the updated payment object
    db.commit()
    db.refresh(payment)

    # Convert updated payment to response model
    updated_payment = PaymentResponse(
        id=payment.id,
        sponsor_id=payment.sponsor_id,
        child_id=payment.child_id,
        amount=payment.amount,
        currency=payment.currency,
        transaction_id=payment.transaction_id,
        payment_method=payment.payment_method,
        status=payment.status,
        payment_date=payment.payment_date.isoformat()
    )

    # Return structured response
    return create_response(
        message="Payment updated successfully",
        data=updated_payment.model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )


@router.delete("/payments/{payment_id}", status_code=status.HTTP_200_OK)
async def delete_payment(
        db: db_dependency,
        logged_in_user: user_dependency,
        payment_id: int = Path(gt=0, description="ID of the payment")):
    """
    Delete a specific payment record.

    🔹 **Access Control**: Only Admins can delete payments.
    🔹 **Raises 403** if a non-admin tries to delete.
    🔹 **Raises 404** if the payment does not exist.

    Args:
        db (Session): Database session.
        logged_in_user (dict): Authenticated user details from JWT.
        payment_id (int): The ID of the payment to delete.

    Returns:
        JSONResponse: Success message if the payment is deleted.
    """

    # Fetch authenticated user
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only admins can delete payments
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete payments."
        )

    # Retrieve the payment (or raise 404 if not found)
    payment = get_payment_or_404(db=db, payment_id=payment_id)

    # Delete payment record
    db.delete(payment)
    db.commit()

    # Return success response
    return create_response(
        message=f"Payment with ID {payment_id} has been deleted successfully.",
        status_code=status.HTTP_200_OK
    )
