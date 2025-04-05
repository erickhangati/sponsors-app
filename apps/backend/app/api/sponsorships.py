from fastapi import APIRouter, HTTPException, Query, Path
from starlette import status

from ..core.security import user_dependency
from ..database import db_dependency
from ..models.sponsorship_model import Sponsorship
from ..models.user_model import User, UserRole
from ..schemas.sponsorship_schema import SponsorshipBase, SponsorshipResponse, \
    SponsorshipUpdate
from ..schemas.user_schema import UserResponse
from ..utils.helpers import get_user_or_404, is_admin, get_sponsorship_or_404
from ..utils.response import create_response

router = APIRouter(tags=['Sponsorship'])


@router.post('/sponsorships',
             response_model=SponsorshipResponse,
             status_code=status.HTTP_201_CREATED)
async def create_sponsorship(
        db: db_dependency,
        logged_in_user: user_dependency,
        sponsorship_data: SponsorshipBase):
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    if not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to perform this action")

    get_user_or_404(db=db, user_id=sponsorship_data.child_id, detail="Child not found")

    sponsor = db.query(User).filter(
        User.id == sponsorship_data.sponsor_id,
        User.role == UserRole.SPONSOR
    ).first()

    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Sponsor not found")

    duplicate = db.query(Sponsorship).filter(
        Sponsorship.child_id == sponsorship_data.child_id,
        Sponsorship.sponsor_id == sponsorship_data.sponsor_id
    ).first()

    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Child already sponsored by this sponsor")

    sponsorship = Sponsorship(**sponsorship_data.model_dump())
    db.add(sponsorship)
    db.commit()
    db.refresh(sponsorship)

    # Prepare response data
    sponsorship_data = SponsorshipResponse.model_validate(sponsorship).model_dump(
        mode="json")

    # Return structured response using utility function
    return create_response(
        message="Sponsorship added successfully",
        data=sponsorship_data,
        status_code=status.HTTP_201_CREATED,
        location=f"/users/{sponsorship.id}"
    )


@router.get("/sponsorships/{sponsor_id}", response_model=dict,
            status_code=status.HTTP_200_OK)
async def get_sponsored_children(
        db: db_dependency,
        logged_in_user: user_dependency,
        sponsor_id: int = Path(gt=0, description='Sponsor id'),
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100,
                               description="Number of children per page (max: 100)")):
    get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Check if sponsor exists
    sponsor = db.query(User).filter(User.id == sponsor_id,
                                    User.role == UserRole.SPONSOR).first()
    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Sponsor not found")

    # Query total count of sponsored children
    total_children = (
        db.query(User)
        .join(Sponsorship, User.id == Sponsorship.child_id)
        .filter(Sponsorship.sponsor_id == sponsor_id)
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
        .filter(Sponsorship.sponsor_id == sponsor_id)
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


@router.get("/sponsorships", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_sponsor_of_child(
        db: db_dependency,
        logged_in_user: user_dependency,
        child_id: int = Query(gt=0,
                              description="The ID of the child whose sponsor is requested")):
    get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Check if the child exists
    child = db.query(User).filter(User.id == child_id,
                                  User.role == UserRole.CHILD).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Child not found or is not a registered child")

    # Get the sponsor
    sponsorship = db.query(Sponsorship).filter(Sponsorship.child_id == child_id).first()

    if not sponsorship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="This child does not have a sponsor")

    sponsor = get_user_or_404(db=db, user_id=sponsorship.sponsor_id,
                              detail="Sponsor not found")

    # Return sponsor details
    return create_response(
        message="Sponsor retrieved successfully",
        data=UserResponse.model_validate(sponsor).model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )


@router.patch("/sponsorships/{sponsorship_id}", response_model=SponsorshipResponse,
              status_code=status.HTTP_200_OK)
async def update_sponsorship(
        db: db_dependency,
        logged_in_user: user_dependency,
        sponsorship_data: SponsorshipUpdate,
        sponsorship_id: int = Path(gt=0,
                                   description="The ID of the sponsorship to update")):
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))

    # Ensure only admins can update sponsorships
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update sponsorships"
        )

    # Retrieve the sponsorship
    sponsorship = get_sponsorship_or_404(db=db, sponsorship_id=sponsorship_id)

    # Update fields dynamically
    if sponsorship_data.start_date:
        sponsorship.start_date = sponsorship_data.start_date
    if sponsorship_data.status:
        sponsorship.status = sponsorship_data.status

    # Commit the changes
    db.commit()
    db.refresh(sponsorship)

    # Return sponsor details
    return create_response(
        message="Sponsorship updated successfully",
        data=SponsorshipResponse.model_validate(sponsorship).model_dump(mode="json"),
        status_code=status.HTTP_200_OK
    )


@router.delete("/sponsorships/{sponsorship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sponsorship(
        db: db_dependency,
        logged_in_user: user_dependency,
        sponsorship_id: int = Path(gt=0,
                                   description="The ID of the sponsorship to cancel")):
    user = get_user_or_404(db=db, user_id=logged_in_user.get('id'))
    # Ensure only admins can delete sponsorships
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to cancel sponsorships"
        )

    # Retrieve the sponsorship
    sponsorship = get_sponsorship_or_404(db=db, sponsorship_id=sponsorship_id)

    # Delete the sponsorship
    db.delete(sponsorship)
    db.commit()
