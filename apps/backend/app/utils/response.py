from typing import Optional, Any, Dict
from starlette import status
from fastapi.responses import JSONResponse


def create_response(
        message: str,
        data: Optional[Any] = None,
        status_code: int = status.HTTP_200_OK,
        location: Optional[str] = None) -> JSONResponse:
    """
    Creates a standardized JSON response for API endpoints.

    Args:
        message (str): A short descriptive message about the response.
        data (Optional[Any]): The response payload (default is None).
        status_code (int): HTTP status code (default is 200 OK).
        location (Optional[str]): URL for the "Location" header (if applicable).

    Returns:
        JSONResponse: A FastAPI JSON response object with the given parameters.
    """

    # Initialize headers dictionary
    headers: Dict[str, str] = {}

    # If a location is provided, add it to the headers
    if location:
        headers["Location"] = location

    # Return a standardized JSON response
    return JSONResponse(
        content={"message": message, "data": data},
        status_code=status_code,
        headers=headers
    )
