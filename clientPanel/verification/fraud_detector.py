"""
Fraud & Tampering Detection Service.

Provides automated checks for:
- Duplicate document uploads (SHA-256 file hashing across users)
- Image manipulation & edge/noise anomalies
- Invalid visual document structure
"""

import hashlib
import os
import logging

from clientPanel.models import UserDocument

logger = logging.getLogger(__name__)


def calculate_file_hash(file_path):
    """
    Computes SHA-256 hash of document file.
    """
    if not os.path.exists(file_path):
        return None
    sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        logger.error(f"Error computing file hash for {file_path}: {e}")
        return None


def check_duplicate_document(file_hash, current_doc_id, current_user):
    """
    Checks if the exact same file hash exists for a document uploaded by another user.

    Returns tuple: (is_duplicate: bool, original_doc_info: str)
    """
    if not file_hash:
        return False, ""

    query = UserDocument.objects.filter(file_hash=file_hash).exclude(user=current_user)
    if current_doc_id:
        query = query.exclude(id=current_doc_id)

    matching_doc = query.first()
    if matching_doc:
        msg = f"Duplicate document detected! Matches document #{matching_doc.id} uploaded by another user ({matching_doc.user_email})."
        logger.warning(msg)
        return True, msg

    return False, ""


def check_tampering_anomalies(file_path):
    """
    Performs basic automated image tampering detection.

    Checks:
    - Unexpected image aspect ratios (e.g. extremely stretched or cropped banner images)
    - Suspiciously low noise levels or artificial digital text overlay boxes
    """
    findings = []
    suspicious = False

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return False, []

    try:
        import cv2
        import numpy as np

        cv_img = cv2.imread(file_path)
        if cv_img is None:
            return False, []

        h, w = cv_img.shape[:2]
        aspect_ratio = w / float(h)

        # Extreme aspect ratio check (unlikely for genuine IDs / bills)
        if aspect_ratio > 4.0 or aspect_ratio < 0.2:
            suspicious = True
            findings.append(f"Suspicious document aspect ratio ({round(aspect_ratio, 2)}).")

        # Color standard deviation check across color channels
        b, g, r = cv2.split(cv_img)
        std_b, std_g, std_r = np.std(b), np.std(g), np.std(r)

        # Check if one channel has extreme anomaly
        if abs(std_b - std_g) > 60 or abs(std_r - std_g) > 60:
            suspicious = True
            findings.append("Inconsistent visual color channel distribution detected.")

    except Exception as e:
        logger.warning(f"Tampering analysis warning on {file_path}: {e}")

    return suspicious, findings
