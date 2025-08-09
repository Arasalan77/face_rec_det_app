"""
main.py
=======

This is the entry point for the FastAPI backend.  It exposes endpoints for
employee registration and attendance checking and serves the static HTML/JS
files that make up the front‑end.  The backend uses a global
``FaceRecognizer`` instance to avoid reloading models on each request.
"""

from __future__ import annotations

import base64
from typing import List, Dict
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .face_recognition import FaceRecognizer
from . import database as db
from .schemas import CheckRequest, CheckResponse, RegisterRequest, RegisterResponse

from typing import Dict

# Create a single recogniser instance.  The model is loaded during app start.
try:
    recognizer = FaceRecognizer()
except ImportError:
    # This will cause all endpoints to fail if InsightFace is missing.
    recognizer = None  # type: ignore

# FastAPI application
app = FastAPI(title="Face Attendance App")

# Ensure database tables are created on startup
@app.on_event("startup")
async def startup_event() -> None:
    # Initialise database tables
    db.init_db()

# Mount static files (CSS/JS) and HTML
BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
STATIC_DIR = TEMPLATE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root() -> HTMLResponse:
    """Redirect root to the registration page."""
    return HTMLResponse(
        '<html><head><meta http-equiv="refresh" content="0; URL=/index.html"/></head></html>'
    )


@app.get("/index.html")
async def get_index() -> FileResponse:
    """Serve the registration page."""
    return FileResponse(str(TEMPLATE_DIR / "index.html"))


@app.get("/checkin.html")
async def get_checkin() -> FileResponse:
    """Serve the attendance page."""
    return FileResponse(str(TEMPLATE_DIR / "checkin.html"))


@app.get("/admin.html")
async def get_admin() -> FileResponse:
    """Serve the admin panel page."""
    return FileResponse(str(TEMPLATE_DIR / "admin.html"))


def decode_base64_image(data: str) -> np.ndarray:
    """
    Decode a base64‑encoded JPEG/PNG image into a BGR NumPy array.  The data
    string must not include the data URI prefix (e.g. ``data:image/jpeg;base64,``).
    """
    try:
        img_bytes = base64.b64decode(data)
    except Exception as e:
        raise ValueError("Invalid base64 image data") from e
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Failed to decode image")
    return frame


@app.post("/register", response_model=RegisterResponse)
async def register_employee(payload: RegisterRequest) -> RegisterResponse:
    """
    Register a new employee by extracting a robust embedding from multiple
    frames captured during registration.  The frames should be sent as
    base64‑encoded JPEG strings.  The aggregated embedding is persisted
    in the database and can later be used to recognise the employee.
    """
    if recognizer is None:
        raise HTTPException(status_code=500, detail="Face recogniser not initialised")

    # Convert base64 frames to BGR images
    frames: List[np.ndarray] = []
    for b64 in payload.frames:
        try:
            frame = decode_base64_image(b64)
            frames.append(frame)
        except Exception:
            # Skip invalid frames
            continue
    if not frames:
        raise HTTPException(status_code=400, detail="No valid frames provided")
    # Compute aggregated embedding
    embedding = recognizer.get_aggregated_embedding(frames)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected in provided frames")
    # Persist employee record
    db.add_employee(payload.employee_id, payload.name, embedding.tolist())
    return RegisterResponse(
        message="Employee registered successfully",
        employee_id=payload.employee_id,
        success=True,
    )


@app.post("/check", response_model=CheckResponse)
async def check_attendance(payload: CheckRequest) -> CheckResponse:
    """
    Recognise an employee in a single frame and mark their attendance.  If a
    face is recognised, the system toggles between check‑in and check‑out
    depending on whether the employee has already checked in today.
    """
    if recognizer is None:
        raise HTTPException(status_code=500, detail="Face recogniser not initialised")
    # Decode the frame
    try:
        frame = decode_base64_image(payload.frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Extract embedding
    embedding = recognizer.get_embedding(frame)
    if embedding is None:
        return CheckResponse(
            employee_id=None,
            name=None,
            status=None,
            similarity=None,
            message="No face detected",
        )
    # Find best match
    result = db.find_best_match(recognizer, embedding.tolist())
    if result is None:
        return CheckResponse(
            employee_id=None,
            name=None,
            status=None,
            similarity=None,
            message="Face not recognised",
        )
    employee_id, similarity = result
    employees = db.load_employees()
    name = employees[employee_id]["name"]
    # Mark attendance
    status = db.mark_attendance(employee_id)
    return CheckResponse(
        employee_id=employee_id,
        name=name,
        status=status,
        similarity=similarity,
        message=f"{name} {status}",
    )


@app.get("/employees")
async def list_employees() -> List[Dict[str, str]]:
    """Return a list of all registered employees (ID and name)."""
    employees = db.load_employees()
    return [
        {"employee_id": emp_id, "name": info["name"]}
        for emp_id, info in employees.items()
    ]


@app.get("/attendance_logs")
async def attendance_logs() -> List[Dict[str, object]]:
    """Return recent attendance logs, ordered from newest to oldest."""
    return db.get_attendance_logs()