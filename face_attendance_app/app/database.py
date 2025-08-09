"""
database.py
===============

This module manages persistence for employees and attendance records using
PostgreSQL via SQLAlchemy.  Employees are identified by a string ID and
have an associated name and a 512‑dimensional face embedding (stored as a
JSON array of floats).  Attendance records keep track of check‑in and
check‑out events with timestamps.  The module exposes helper functions
to initialise the database, add employees, find the best matching
employee given an embedding, and toggle attendance for a given day.

The default database URL points at a local PostgreSQL instance
(see ``docker-compose.yml``).  You can override it by setting the
``DATABASE_URL`` environment variable, e.g. to connect to a managed
database service.
"""

from __future__ import annotations

import os
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    DateTime,
    func,
    ForeignKey,
    JSON,
    select,
    desc,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from .face_recognition import FaceRecognizer


# Define the SQLAlchemy base and session
Base = declarative_base()

# Database URL from environment variable or default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/postgres",
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Employee(Base):
    """SQLAlchemy model for employees."""

    __tablename__ = "employees"

    employee_id: str = Column(String, primary_key=True)
    name: str = Column(String, nullable=False)
    embedding: List[float] = Column(JSON, nullable=False)


class Attendance(Base):
    """SQLAlchemy model for attendance events."""

    __tablename__ = "attendance"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    employee_id: str = Column(String, ForeignKey("employees.employee_id"), nullable=False)
    timestamp: datetime = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: str = Column(String, nullable=False)  # "checkin" or "checkout"


def init_db() -> None:
    """Create all tables in the database.  Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    """Return a new SQLAlchemy session."""
    return SessionLocal()


def add_employee(employee_id: str, name: str, embedding: List[float]) -> None:
    """
    Insert or update an employee record.  If an employee with the same ID
    already exists, their name and embedding are updated.  Otherwise a
    new record is created.

    :param employee_id: unique identifier for the employee
    :param name: employee's full name
    :param embedding: 512‑dimensional embedding vector (list of floats)
    """
    with get_session() as session:
        employee = session.get(Employee, employee_id)
        if employee is None:
            employee = Employee(employee_id=employee_id, name=name, embedding=embedding)
            session.add(employee)
        else:
            employee.name = name
            employee.embedding = embedding
        session.commit()


def load_employees(session: Optional[Session] = None) -> Dict[str, Dict[str, object]]:
    """
    Load all employees into a dictionary keyed by employee ID.  Each value is
    a dictionary with 'name' and 'embedding' keys.

    :param session: optional SQLAlchemy session; if not provided one will
        be created and closed.
    :return: mapping from employee_id to record
    """
    own_session = False
    if session is None:
        session = get_session()
        own_session = True
    employees = {}
    for row in session.execute(select(Employee)).scalars():
        employees[row.employee_id] = {
            "name": row.name,
            "embedding": row.embedding,
        }
    if own_session:
        session.close()
    return employees


def find_best_match(
    recognizer: FaceRecognizer, target_embedding: List[float], threshold: float = 0.5
) -> Optional[Tuple[str, float]]:
    """
    Find the employee whose stored embedding has the highest cosine similarity
    to the provided embedding.  Returns ``None`` if no similarity exceeds
    the given threshold.

    :param recognizer: FaceRecognizer instance providing the similarity function
    :param target_embedding: embedding vector to compare against
    :param threshold: minimum cosine similarity required for a match
    :return: (employee_id, similarity) or ``None``
    """
    target_vec = None
    import numpy as np  # Local import to avoid heavy import if not needed

    target_vec = np.array(target_embedding, dtype=np.float32)
    # Normalise the input embedding to unit length
    norm = np.linalg.norm(target_vec)
    if norm > 0:
        target_vec = target_vec / norm
    # Iterate over employees and compute similarity
    best_id: Optional[str] = None
    best_similarity: float = -1.0
    with get_session() as session:
        for row in session.execute(select(Employee)).scalars():
            emb = np.array(row.embedding, dtype=np.float32)
            # Normalise stored embedding
            norm_e = np.linalg.norm(emb)
            if norm_e > 0:
                emb = emb / norm_e
            similarity = recognizer.cosine_similarity(target_vec, emb)
            if similarity > best_similarity:
                best_similarity = similarity
                best_id = row.employee_id
    if best_id is None or best_similarity < threshold:
        return None
    return best_id, best_similarity


def mark_attendance(employee_id: str) -> str:
    """
    Toggle attendance for the current date.  If the employee has no
    attendance record today, a check‑in is recorded.  If the last record
    today is a check‑in, then a check‑out is recorded.  Otherwise a new
    check‑in is recorded.

    :param employee_id: employee's ID
    :return: the new attendance status ("checkin" or "checkout")
    """
    today = date.today()
    with get_session() as session:
        # Find the most recent attendance record for this employee
        stmt = (
            select(Attendance)
            .where(Attendance.employee_id == employee_id)
            .order_by(desc(Attendance.timestamp))
        )
        last_record: Optional[Attendance] = session.execute(stmt).scalars().first()
        # Determine if last record is from today and the status
        new_status = "checkin"
        if last_record is not None and last_record.timestamp.date() == today:
            new_status = "checkout" if last_record.status == "checkin" else "checkin"
        # Add new attendance record
        attendance = Attendance(employee_id=employee_id, status=new_status)
        session.add(attendance)
        session.commit()
    return new_status


def get_attendance_logs(limit: int = 100) -> List[Dict[str, object]]:
    """
    Retrieve a list of recent attendance events.  Returns up to ``limit``
    records ordered by most recent first.  Each log includes the employee
    ID, timestamp (ISO format), status, and the employee name.

    :param limit: maximum number of events to return
    :return: list of log dictionaries
    """
    logs: List[Dict[str, object]] = []
    with get_session() as session:
        stmt = select(Attendance).order_by(desc(Attendance.timestamp)).limit(limit)
        for attendance in session.execute(stmt).scalars():
            # Lookup employee name
            emp = session.get(Employee, attendance.employee_id)
            name = emp.name if emp else None
            logs.append(
                {
                    "employee_id": attendance.employee_id,
                    "name": name,
                    "timestamp": attendance.timestamp.isoformat(),
                    "status": attendance.status,
                }
            )
    return logs