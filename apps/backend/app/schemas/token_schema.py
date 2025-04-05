from pydantic import BaseModel


class Token(BaseModel):
    """Schema for a token."""

    access_token: str
    token_type: str
