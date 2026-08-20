"""
Sanitization module alias linking sanitizer.py
"""

from .sanitizer import sanitize_and_validate_file, purge_rejected_document_file

__all__ = ["sanitize_and_validate_file", "purge_rejected_document_file"]
