# Face Attendance App

This repository contains a proof‑of‑concept face attendance system built with Python and JavaScript.  The application allows employees to register their faces from a 360° live video feed and subsequently check‑in and check‑out using automatic face recognition.  A FastAPI backend processes frames using state‑of‑the‑art deep learning models for face detection and recognition and records attendance information.

## Background

Reliable face recognition requires both accurate face detection and discriminative feature extraction.  Recent research has shown that using an **additive angular margin loss** (ArcFace) yields highly discriminative embeddings.  The ArcFace paper explains that the proposed loss produces features with a clear geometric interpretation and “consistently outperforms the state of the art” in face recognition benchmarks【606641341669872†L15-L23】.  For face detection, **RetinaFace** provides a single‑shot, multi‑level solution that unifies face box prediction with facial landmark and 3D vertex estimation.  It can simultaneously achieve stable face detection, accurate alignment and robust 3D reconstruction while remaining efficient【958030019004540†L18-L31】.  Both methods are available via the open‑source **InsightFace** library.

This project leverages these advances by using InsightFace’s pretrained RetinaFace detector and ArcFace recognizer.  During registration the user is instructed to rotate their head so the system can capture embeddings from multiple angles.  The backend aggregates those embeddings to build a robust identity profile that is resilient to changes in pose, ageing, glasses or facial hair.  At check‑in/out the system recognises faces in real‑time video frames and marks attendance accordingly.

## Features

* **Employee Registration** – A simple web form collects basic employee details (name and ID).  The registration page opens a live video feed and prompts the user to slowly rotate their head in a circular motion.  Frames from the entire sequence are sent to the backend, where RetinaFace detects the face and ArcFace extracts embeddings.  The aggregated embedding is stored alongside the employee record in a PostgreSQL database.
* **Automatic Check‑in/Check‑out** – The check‑in page displays a full‑screen camera view.  The backend continuously processes frames; when a known face is recognised it records a check‑in time if none exists for the day, otherwise it records a check‑out time.  Recognised names and statuses are displayed in real time.
* **Robustness to Variations** – By capturing multiple angles during registration and using discriminative embeddings from ArcFace, the system handles partial occlusions, ageing, eyewear, facial hair, and even look‑alikes.  RetinaFace’s ability to detect small faces and provide 2D landmarks improves alignment and reduces false positives【958030019004540†L18-L31】.
* **Database‑backed Storage** – Employee embeddings and attendance logs are stored in a relational database (PostgreSQL) instead of local JSON files.  SQLAlchemy manages tables for employees and attendance events and provides automatic schema creation at startup.

## Installation & Running

The project ships with a `Dockerfile` and `docker-compose.yml` that automate setup of all dependencies, including a PostgreSQL database and the required deep‑learning models.  To build and run the application:

```sh
# Build the services (backend and database) and start them
docker compose up --build
```

`docker compose` downloads the InsightFace models on first run and prepares the database schema automatically.  Once running, the FastAPI backend listens on port `8000` and PostgreSQL listens on port `5432` (internal network only).  Visit the following pages in your browser:

* **Registration:** `http://localhost:8000/index.html`
* **Attendance:** `http://localhost:8000/checkin.html`

If you wish to run the backend without Docker, install the dependencies listed in `requirements.txt` (including `insightface`, `onnxruntime`, `sqlalchemy`, `psycopg2-binary`) and set the `DATABASE_URL` environment variable to point at your PostgreSQL server.  Then start the server with:

```sh
uvicorn face_attendance_app.app.main:app --host 0.0.0.0 --port 8000
```

## Project Structure

```
face_attendance_app/
├── README.md            # This file
├── requirements.txt     # List of Python dependencies
├── app/
│   ├── main.py          # FastAPI entry point
│   ├── face_recognition.py  # Wrapper around InsightFace models
│   ├── database.py      # SQLAlchemy models and helpers
│   ├── schemas.py       # Pydantic models for requests/responses
│   └── templates/
│       ├── index.html   # Registration page
│       ├── checkin.html # Check‑in/out page
│       └── static/
│           ├── js/
│           │   ├── video_capture.js
│           │   └── checkin.js
│           └── css/
│               └── styles.css
├── Dockerfile           # Builds the backend image
└── docker-compose.yml   # Orchestrates the backend and PostgreSQL
```

## Limitations and next steps

This implementation is suitable as a foundation for a production system but still requires several enhancements:

* **Security** – All API endpoints are currently open.  In a real deployment you should enable HTTPS, authenticate and authorise clients, and implement CSRF protections.  Sensitive data (face embeddings) should be encrypted at rest and in transit.
* **Scalability** – Model inference is performed synchronously inside the web process.  For high user loads you might offload face recognition to a separate worker or GPU‑powered microservice and communicate via a message queue.
* **Streaming protocols** – The front‑end posts discrete base64 images for simplicity.  Using WebSockets or WebRTC would reduce latency and bandwidth usage.
* **Administration tools** – There is no interface for listing or editing employees, reviewing attendance logs, or generating reports.  These features could be added using FastAPI and a front‑end framework of your choice.

Despite these limitations, the core architecture demonstrates how cutting‑edge face detection and recognition can be combined with a relational database to build an accurate and robust attendance system.