"""
Public Service API for Document Verification System.

Supports both synchronous and asynchronous document verification dispatch.
"""

import logging
from .decision_engine import process_document_verification

logger = logging.getLogger(__name__)


def trigger_document_verification(document_id, async_mode=True, performed_by_user=None, ip_address=None):
    """
    Triggers document verification pipeline for a given document_id.
    
    If async_mode=True and Celery is available, dispatches background task.
    Otherwise runs synchronously.
    
    Returns verification result dictionary or async status dictionary.
    """
    if async_mode:
        try:
            from clientPanel.tasks import verify_user_document_task
            user_id = performed_by_user.id if performed_by_user else None
            # Use apply_async with retry=False to fail fast if Redis broker is offline
            task_res = verify_user_document_task.apply_async(
                args=[document_id, user_id, ip_address],
                retry=False
            )
            return {
                'document_id': document_id,
                'status': 'processing',
                'task_id': task_res.id if hasattr(task_res, 'id') else None,
                'verification_method': 'automatic',
                'message': 'Document verification scheduled in background.',
            }
        except Exception as e:
            logger.warning(f"Async Celery/Redis dispatch skipped for doc #{document_id} ({e}). Executing verification synchronously.")

    # Synchronous processing fallback
    return process_document_verification(
        document_id=document_id,
        performed_by_user=performed_by_user,
        ip_address=ip_address
    )
