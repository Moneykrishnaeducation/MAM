"""
Main Document Verification Orchestrator & Decision Engine.

Runs the complete 12-step verification workflow:
1. Receive uploaded document & validate file
2. Quality checks (blur, resolution, corrupt, blank image)
3. Local OCR text extraction
4. Document classification & type mismatch detection
5. Fraud & duplicate document detection
6. Extract structured information
7. Compare extracted fields against user Django profile
8. Document-specific validation rules (Identity vs Residence)
9. Calculate weighted confidence score
10. Automatic decision (approved, rejected, manual_review)
11. Save database result & update User model status
12. Complete audit trail in DocumentVerificationAuditLog
"""

import os
import logging
from django.utils import timezone
from django.db import transaction

from clientPanel.models import UserDocument, DocumentVerificationAuditLog
from .ocr_engine import check_document_quality, extract_text_from_document
from .classifier import classify_document
from .fraud_detector import calculate_file_hash, check_duplicate_document, check_tampering_anomalies
from .identity_verifier import verify_identity_document
from .residence_verifier import verify_residence_document
from .scoring_engine import evaluate_verification_decision

logger = logging.getLogger(__name__)


def process_document_verification(document_id, performed_by_user=None, ip_address=None):
    """
    Main entry point for processing document verification on a UserDocument instance.
    
    Returns dict with verification results.
    """
    try:
        doc = UserDocument.objects.select_related('user').get(id=document_id)
    except UserDocument.DoesNotExist:
        logger.error(f"UserDocument #{document_id} not found.")
        return {'error': f"Document #{document_id} not found."}

    user = doc.user
    prev_status = doc.verification_status or doc.status

    # Set status to processing
    doc.verification_status = 'processing'
    doc.status = 'processing'
    doc.save(update_fields=['verification_status', 'status', 'updated_at'])

    file_path = doc.document.path if doc.document else ""

    if not file_path or not os.path.exists(file_path):
        doc.verification_status = 'failed'
        doc.status = 'failed'
        doc.verification_reason = "Document file path does not exist on disk."
        doc.verification_errors = ["File missing on storage."]
        doc.save()
        
        _create_audit_log(
            document=doc,
            user=user,
            action='system_error',
            prev_status=prev_status,
            new_status='failed',
            confidence=0,
            reason="Document file path does not exist on disk.",
            errors=["File missing on storage."],
            performed_by=performed_by_user,
            ip_address=ip_address
        )
        return {
            'document_id': doc.id,
            'document_type': doc.document_type,
            'status': 'failed',
            'confidence_score': 0,
            'reason': "Document file path does not exist on disk.",
        }

    # Step 1: Compute File Hash & Check Duplication
    file_hash = calculate_file_hash(file_path)
    if file_hash:
        doc.file_hash = file_hash

    is_duplicate, duplicate_msg = check_duplicate_document(file_hash, doc.id, user)
    tampered, tamper_findings = check_tampering_anomalies(file_path)

    # Step 2: Perform Image / PDF Quality Checks
    quality_res = check_document_quality(file_path)

    # Step 3: Extract Text via Local OCR Engine
    ocr_text, ocr_engine_used, ocr_conf = extract_text_from_document(file_path)
    doc.ocr_engine = ocr_engine_used

    # Step 4: Document Classification Check
    classification_res = classify_document(ocr_text, doc.document_type)

    # Step 5 & 6: Specific Verification Pipeline (Identity vs Residence)
    if doc.document_type == 'identity':
        scores_dict, extracted_data, warnings = verify_identity_document(
            user, doc, file_path, ocr_text, quality_res
        )
    else: # residence
        scores_dict, extracted_data, warnings = verify_residence_document(
            user, doc, file_path, ocr_text, quality_res
        )

    if tamper_findings:
        warnings.extend(tamper_findings)

    # Step 7 & 8: Calculate Confidence Score & Evaluate Decision
    fraud_res = (is_duplicate, duplicate_msg)
    decision, confidence_score, reason, errors = evaluate_verification_decision(
        doc.document_type,
        scores_dict,
        quality_res,
        classification_res,
        fraud_res,
        warnings
    )

    # Step 9: Save Database Results & Update User Status atomically
    with transaction.atomic():
        doc.verification_status = decision
        doc.status = decision
        doc.confidence_score = confidence_score
        doc.verification_reason = reason
        doc.extracted_data = extracted_data
        doc.verification_errors = errors
        doc.verified_at = timezone.now()
        doc.verification_method = 'automatic'
        doc.save()

        # Update User Profile Verification Status Flags
        _sync_user_profile_status(user, doc, decision)

        # Step 9.5: Run Cross-Document Consistency Check if both documents exist
        try:
            from .cross_document_verifier import verify_cross_documents
            cross_res = verify_cross_documents(user)
            if not cross_res.get('is_consistent', True):
                logger.warning(f"Cross-document mismatch detected for user {user.id}: {cross_res['explanation']}")
                p_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or getattr(user, 'username', '')
                failing_docs = cross_res.get('failing_docs', [])
                failing_ids = [f[0] for f in failing_docs]

                if doc.id in failing_ids:
                    decision = 'rejected'
                    doc.verification_status = 'rejected'
                    doc.status = 'rejected'
                    reason = f"major_name_mismatch: The name on the uploaded document does not match your registered profile name ('{p_name}'). Please upload a document belonging to {p_name}."
                    doc.verification_reason = reason
                    doc.rejection_reason = reason
                    if reason not in errors:
                        errors.append(reason)
                    doc.verification_errors = errors
                    doc.save()
                    _sync_user_profile_status(user, doc, 'rejected')
                else:
                    # Update any other document that failed profile name matching to rejected
                    for f_id, f_type, f_name in failing_docs:
                        try:
                            f_doc = UserDocument.objects.get(id=f_id)
                            f_doc.verification_status = 'rejected'
                            f_doc.status = 'rejected'
                            f_reason = f"major_name_mismatch: The name on the uploaded document ('{f_name}') does not match your registered profile name ('{p_name}'). Please upload a document belonging to {p_name}."
                            f_doc.verification_reason = f_reason
                            f_doc.rejection_reason = f_reason
                            f_doc.save()
                            _sync_user_profile_status(user, f_doc, 'rejected')
                        except Exception:
                            pass
                    if decision == 'approved':
                        doc.verification_status = 'approved'
                        doc.status = 'approved'
                        doc.save()
                        _sync_user_profile_status(user, doc, 'approved')
        except Exception as cross_err:
            logger.warning(f"Cross-document verification error: {cross_err}")

        # Step 10: Create Complete Audit Log
        _create_audit_log(
            document=doc,
            user=user,
            action='automatic_verification',
            prev_status=prev_status,
            new_status=decision,
            confidence=confidence_score,
            extracted=extracted_data,
            reason=reason,
            errors=errors,
            performed_by=performed_by_user,
            ip_address=ip_address
        )

        # Step 11: Auto-Delete Physical Storage File if Document is Rejected
        if decision == 'rejected' or doc.status == 'rejected':
            try:
                from .sanitization import purge_rejected_document_file
                purge_rejected_document_file(doc)
                logger.info(f"Auto-deleted physical file for rejected document #{doc.id}")
            except Exception as p_err:
                logger.warning(f"Failed to purge rejected document file #{doc.id}: {p_err}")

    logger.info(f"Document Verification Completed for #{doc.id} ({doc.document_type}): Status={decision}, Score={confidence_score}%, Reason='{reason}'")

    return {
        'document_id': doc.id,
        'document_type': doc.document_type,
        'status': decision,
        'verification_method': doc.verification_method,
        'confidence_score': confidence_score,
        'reason': reason,
        'extracted_data': extracted_data,
        'verification_errors': errors,
    }


def _sync_user_profile_status(user, document, decision):
    """
    Synchronizes User model verification flags when a document status changes.
    """
    if not user:
        return

    update_fields = []

    if document.document_type == 'identity':
        if decision == 'approved':
            user.id_proof_verified = True
            update_fields.append('id_proof_verified')
        elif decision == 'rejected':
            user.id_proof_verified = False
            update_fields.append('id_proof_verified')
    elif document.document_type == 'residence':
        if decision == 'approved':
            user.address_proof_verified = True
            update_fields.append('address_proof_verified')
        elif decision == 'rejected':
            user.address_proof_verified = False
            update_fields.append('address_proof_verified')

    # Update overall user verification status
    if getattr(user, 'id_proof_verified', False) and getattr(user, 'address_proof_verified', False):
        user.verification_status = 'verified'
        update_fields.append('verification_status')
    elif decision == 'rejected':
        user.verification_status = 'rejected'
        update_fields.append('verification_status')

    if update_fields:
        user.save(update_fields=list(set(update_fields)))


def _create_audit_log(document, user, action, prev_status, new_status, confidence, reason, errors, performed_by=None, ip_address=None, extracted=None):
    """
    Creates an immutable audit log entry in DocumentVerificationAuditLog.
    """
    try:
        DocumentVerificationAuditLog.objects.create(
            document=document,
            user=user,
            action=action,
            previous_status=prev_status,
            new_status=new_status,
            confidence_score=confidence,
            extracted_data=extracted or {},
            verification_reason=reason,
            verification_errors=errors or [],
            performed_by=performed_by,
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(f"Failed to create document verification audit log: {e}")
