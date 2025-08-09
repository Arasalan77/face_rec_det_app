"""
face_recognition.py
====================

This module wraps the InsightFace library to provide high‑level face detection
and recognition functions.  It uses RetinaFace for face detection and ArcFace
for generating embeddings.  The `FaceRecognizer` class exposes methods to
extract embeddings from individual frames or a sequence of frames and to
compute similarity scores.

If InsightFace is not available or its models have not been downloaded, the
initialisation of `FaceRecognizer` will raise an exception.  See the project
README for instructions on installing InsightFace and downloading models.

"""

from __future__ import annotations

import numpy as np
from typing import List, Optional

try:
    from insightface.app import FaceAnalysis  # type: ignore
except Exception:
    # Defer import errors until initialisation.  This allows the module to
    # import without InsightFace and lets the caller handle the failure.
    FaceAnalysis = None  # type: ignore


class FaceRecognizer:
    """A wrapper around InsightFace's detection and recognition models."""

    def __init__(self, det_size: tuple[int, int] = (640, 640)) -> None:
        """
        Initialise the face recogniser.  Prepares the underlying InsightFace
        models for detection and embedding extraction.

        :param det_size: tuple specifying the width and height used for
                         internal face detection.  Larger sizes yield more
                         accurate detection at the cost of speed.
        """
        if FaceAnalysis is None:
            raise ImportError(
                "InsightFace is required for FaceRecognizer. Install it with `pip install insightface onnxruntime`."
            )
        # Create the face analysis application.  The `name` argument selects a
        # combined detector/recogniser package.  `buffalo_l` includes a
        # RetinaFace detector and an ArcFace recogniser trained on cleaned
        # MS1M and VGGFace2 datasets.
        self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        # Prepare will download the required models if they are not already
        # cached.  ctx_id=-1 selects the CPU; supply a GPU id to use CUDA.
        self.app.prepare(ctx_id=-1, det_size=det_size)

    def get_embedding(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect the largest face in the provided frame and return its
        normalised 512‑dimensional embedding vector.  If no face is
        detected, returns ``None``.

        :param frame: BGR image as a NumPy array (as read by OpenCV)
        :return: 1×512 normalised embedding or ``None``
        """
        faces = self.app.get(frame)
        if not faces:
            return None
        # Choose the face with the largest bounding box area.
        faces_sorted = sorted(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
        embedding = faces_sorted[0].normed_embedding
        return embedding.astype(np.float32)

    def get_aggregated_embedding(self, frames: List[np.ndarray]) -> Optional[np.ndarray]:
        """
        Compute a single embedding from a list of frames by averaging the
        embeddings of individual frames.  Frames without detected faces are
        skipped.  If no valid face is found in any frame, returns ``None``.

        :param frames: list of BGR images
        :return: 1×512 embedding vector or ``None``
        """
        embeddings: List[np.ndarray] = []
        for frame in frames:
            emb = self.get_embedding(frame)
            if emb is not None:
                embeddings.append(emb)
        if not embeddings:
            return None
        # Compute the mean embedding and normalise it.
        mean_emb = np.mean(np.stack(embeddings, axis=0), axis=0)
        # Normalise to unit length
        norm = np.linalg.norm(mean_emb)
        if norm > 0:
            mean_emb = mean_emb / norm
        return mean_emb.astype(np.float32)

    @staticmethod
    def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Compute the cosine similarity between two embedding vectors.  Both
        vectors are assumed to be normalised to unit length.

        :param vec1: 1×D vector
        :param vec2: 1×D vector
        :return: cosine similarity ∈ [−1, 1]
        """
        return float(np.dot(vec1, vec2))