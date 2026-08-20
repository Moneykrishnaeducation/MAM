"""
Document Sanitization & Security Module.

1. Sanitizes uploaded files:
   - Prevents path traversal & double extension exploits (.php.jpg).
   - Verifies magic header bytes (JPEG, PNG, WEBP, PDF).
   - Strips EXIF metadata & re-encodes image files using Pillow to purge any embedded payloads.
   - Blocks PDF scripting/active execution objects.

2. Auto-deletes rejected document files:
   - Ensures rejected documents are NOT stored on server disk storage.
"""

import os
import io
import re
import logging
from PIL import Image
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

DANGEROUS_EXTENSIONS = {
    "php",
    "php3",
    "php4",
    "php5",
    "phtml",
    "exe",
    "dll",
    "so",
    "sh",
    "bat",
    "cmd",
    "vbs",
    "js",
    "jar",
    "py",
    "pl",
    "cgi",
    "asp",
    "aspx",
    "jsp",
    "html",
    "htm",
    "xhtml",
}

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "pdf", "heic", "heif"}


def sanitize_and_validate_file(file_obj):
    """
    Sanitizes and validates an uploaded document file.

    Returns tuple: (is_valid: bool, sanitized_file_or_error: ContentFile/UploadedFile/str)
    """
    if not file_obj:
        return False, "No file provided."

    orig_name = getattr(file_obj, "name", "file.jpg")
    clean_name = os.path.basename(orig_name).replace("\\", "/").split("/")[-1]

    # 1. Path Traversal & Double Extension Security Checks
    if ".." in clean_name or "/" in clean_name or "\\" in clean_name:
        return False, "Invalid filename: Path traversal attempt detected."

    parts = clean_name.lower().split(".")
    if len(parts) > 1:
        ext = parts[-1]
        for p in parts[:-1]:
            if p in DANGEROUS_EXTENSIONS:
                return False, f"Malicious double extension detected (.{p}.{ext})."
        if ext in DANGEROUS_EXTENSIONS:
            return False, f"Prohibited file extension (.{ext})."
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file format (.{ext}). Allowed formats: JPG, PNG, WEBP, PDF."

    # 2. File Size Check (Max 10MB)
    if hasattr(file_obj, "size") and file_obj.size > 10 * 1024 * 1024:
        return False, "File size exceeds maximum allowed limit of 10MB."

    # Seek to start
    try:
        file_obj.seek(0)
    except Exception:
        pass

    header = file_obj.read(512) or b""
    try:
        file_obj.seek(0)
    except Exception:
        pass

    # 3. Magic Header Byte Verification
    is_jpeg = header.startswith(b"\xff\xd8\xff")
    is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = header.startswith(b"RIFF") and b"WEBP" in header[:16]
    is_pdf = header.startswith(b"%PDF-")

    if not (is_jpeg or is_png or is_webp or is_pdf):
        return (
            False,
            "File header signature does not match a valid JPEG, PNG, WEBP, or PDF document.",
        )

    # 4. Image Sanitization: EXIF Metadata Stripping & Re-encoding
    if is_jpeg or is_png or is_webp:
        try:
            file_obj.seek(0)
            img = Image.open(file_obj)
            img.verify()

            file_obj.seek(0)
            img = Image.open(file_obj)

            buffer = io.BytesIO()
            fmt = img.format if img.format in ["JPEG", "PNG", "WEBP"] else "JPEG"

            if fmt == "JPEG" and img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Save clean image without EXIF or comments
            img.save(buffer, format=fmt, quality=92, optimize=True)
            buffer.seek(0)

            sanitized = ContentFile(buffer.getvalue(), name=clean_name)
            setattr(sanitized, "content_type", f"image/{fmt.lower()}")
            return True, sanitized

        except Exception as img_err:
            logger.warning(f"Image sanitization error: {img_err}")
            return False, "Uploaded file is corrupted or is not a valid image."

    # 5. PDF Security Checks
    if is_pdf:
        try:
            file_obj.seek(0)
            raw = (file_obj.read(8192) or b"").lower()
            file_obj.seek(0)

            suspicious = [
                b"/javascript",
                b"/js",
                b"/openaction",
                b"/launch",
                b"<script",
                b"javascript:",
            ]
            for token in suspicious:
                if token in raw:
                    return False, "PDF contains forbidden embedded scripts or execution commands."

        except Exception as pdf_err:
            logger.warning(f"PDF validation error: {pdf_err}")
            return False, "Uploaded PDF document is invalid or corrupted."

    try:
        file_obj.seek(0)
    except Exception:
        pass

    return True, file_obj


def purge_rejected_document_file(user_document):
    """
    Auto-deletes physical storage files for rejected documents.
    Ensures rejected files are NOT retained on disk storage.
    """
    if not user_document:
        return

    try:
        file_path = None
        if hasattr(user_document, "document") and user_document.document:
            try:
                file_path = user_document.document.path
            except Exception:
                file_path = None

            # Delete file from storage
            try:
                user_document.document.delete(save=False)
            except Exception as del_err:
                logger.warning(f"Field delete error for doc #{user_document.id}: {del_err}")

        # Clear document field on model
        user_document.document = None
        user_document.save(update_fields=["document"])

        # Double check physical file removal on disk
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(
                    f"Purged physical file at {file_path} for rejected document #{user_document.id}"
                )
            except Exception as os_err:
                logger.warning(f"Failed to remove physical file {file_path}: {os_err}")

    except Exception as e:
        logger.warning(
            f"Error purging rejected document file #{getattr(user_document, 'id', 'unknown')}: {e}"
        )
