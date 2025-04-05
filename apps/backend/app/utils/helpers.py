from fastapi import HTTPException
from sqlalchemy import exists
from starlette import status

from ..database import db_dependency
from ..models.user_model import User, UserRole
from ..models.sponsorship_model import Sponsorship
from ..models.payment_model import Payment


def is_admin(user: User) -> bool:
    """Check if a user is an admin."""
    return user.role == UserRole.ADMIN.value


def is_sponsor_of_child(db: db_dependency, sponsor_id: int, child_id: int) -> bool:
    """
    Check if a sponsor is linked to a child via sponsorship.
    Uses `exists()` for better performance instead of fetching all data.
    """
    return db.query(exists().where(
        Sponsorship.sponsor_id == sponsor_id,
        Sponsorship.child_id == child_id
    )).scalar()


def get_user_or_404(db: db_dependency, user_id: int, detail: str = "User not found") -> (
        User):
    """Fetch a user and raise 404 if not found."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )
    return user


def get_sponsorship_or_404(db: db_dependency, sponsorship_id: int) -> Sponsorship:
    """Fetch a sponsorship and raise 404 if not found."""
    sponsorship = db.query(Sponsorship).filter(Sponsorship.id == sponsorship_id).first()
    if not sponsorship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sponsorship with ID {sponsorship_id} not found"
        )
    return sponsorship


def get_payment_or_404(db: db_dependency, payment_id: int) -> Payment:
    """Fetch a payment and raise 404 if not found."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found"
        )
    return payment


def paginate_query(query, page: int, page_size: int):
    """
    Apply pagination to a query.
    Returns paginated results and total count.
    """
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size  # Ceiling division

    results = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "results": results,
        "total_count": total_count,
        "total_pages": total_pages
    }
