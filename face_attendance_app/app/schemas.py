"""
schemas.py
===========

Pydantic models for request and response bodies used in the API.  Using
schemas allows FastAPI to validate input data and automatically generate
OpenAPI documentation.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """Schema for employee registration requests."""

    employee_id: str = Field(..., description="Unique identifier for the employee")
    name: str = Field(..., description="Full name of the employee")
    frames: List[str] = Field(
        ..., description="List of base64‑encoded JPEG frames captured during registration"
    )


class RegisterResponse(BaseModel):
    message: str
    employee_id: str
    success: bool = True


class CheckRequest(BaseModel):
    """Schema for attendance check requests."""

    frame: str = Field(..., description="Base64‑encoded JPEG frame for recognition")


class CheckResponse(BaseModel):
    employee_id: Optional[str]
    name: Optional[str]
    status: Optional[str]
    similarity: Optional[float]
    message: str