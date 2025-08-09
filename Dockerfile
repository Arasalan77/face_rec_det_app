FROM python:3.11-slim

LABEL maintainer="Face Attendance App"

# Install system dependencies for insightface (compilers, libraries).
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libgl1-mesa-glx \
        libglib2.0-0 \
        libpq-dev \
        gcc \
        g++ && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY face_attendance_app/requirements.txt ./requirements.txt

# Upgrade pip and install packages without hash checking
RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install --no-cache-dir --disable-pip-version-check --timeout=60 -r requirements.txt

# Copy application code
COPY face_attendance_app /app/face_attendance_app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Run the FastAPI app with Uvicorn
CMD ["python", "-m", "uvicorn", "face_attendance_app.app.main:app", "--host", "0.0.0.0", "--port", "8000"]