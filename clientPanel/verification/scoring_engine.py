"""
Verification Scoring & Critical Override Engine.

Calculates weighted confidence scores based on configurable weights.
Enforces critical failure overrides (e.g. quality failure, document type mismatch,
duplicate detection, major name/DOB mismatches) to prevent false approvals.
"""

import logging
from .config import (
    IDENTITY_WEIGHTS,
    RESIDENCE_WEIGHTS,
    DECISION_THRESHOLDS,
)

logger = logging.getLogger(__name__)


def calculate_identity_score(scores_dict):
    """
    Calculates weighted confidence score for Identity documents.
    """
    weights = IDENTITY_WEIGHTS
    
    score = (
        (scores_dict.get('name_match_score', 0) * weights['name']) +
        (scores_dict.get('dob_match_score', 0) * weights['dob']) +
        (scores_dict.get('doc_number_score', 0) * weights['doc_number']) +
        (scores_dict.get('doc_type_score', 0) * weights['doc_type']) +
        (scores_dict.get('quality_score', 0) * weights['quality'])
    )

    return min(100.0, max(0.0, round(score, 2)))


def calculate_residence_score(scores_dict):
    """
    Calculates weighted confidence score for Residence documents.
    """
    weights = RESIDENCE_WEIGHTS
    
    score = (
        (scores_dict.get('name_match_score', 0) * weights['name']) +
        (scores_dict.get('address_match_score', 0) * weights['address']) +
        (scores_dict.get('doc_type_score', 0) * weights['doc_type']) +
        (scores_dict.get('date_validity_score', 0) * weights['date_validity'])
    )

    return min(100.0, max(0.0, round(score, 2)))


def evaluate_verification_decision(document_type, scores_dict, quality_metrics, classification_result, fraud_result, warnings):
    """
    Determines final verification decision: 'approved', 'rejected', or 'manual_review'.
    
    Applies configurable decision thresholds and critical failure overrides.
    """
    is_type_valid, detected_type, type_confidence, type_mismatch_reason = classification_result
    is_duplicate, duplicate_msg = fraud_result

    errors = list(quality_metrics.get('quality_errors', [])) + list(warnings)

    # 1. Calculate Weighted Score
    if document_type == 'identity':
        confidence = calculate_identity_score(scores_dict)
    else:
        confidence = calculate_residence_score(scores_dict)

    # Convert confidence to integer 0-100
    confidence_int = int(round(confidence))

    decision = 'manual_review'
    reason = ""

    # 2. Check Critical Overrides
    if quality_metrics.get('is_corrupt'):
        decision = 'rejected'
        reason = "Uploaded document file is corrupt or unreadable."
        return decision, confidence_int, reason, errors

    if not quality_metrics.get('is_quality_sufficient'):
        decision = 'manual_review'
        reason = f"document_quality_insufficient: {', '.join(quality_metrics.get('quality_errors', []))}"
        return decision, confidence_int, reason, errors

    if is_duplicate:
        decision = 'manual_review'
        reason = f"duplicate_document_detected: {duplicate_msg}"
        errors.append(duplicate_msg)
        return decision, confidence_int, reason, errors

    # Major Name Mismatch Override
    if scores_dict.get('name_match_score', 0) < 40.0:
        decision = 'rejected'
        reason = "major_name_mismatch: The name on the uploaded document does not match your registered profile name. Please upload a document belonging to the profile user."
        errors.append(reason)
        return decision, confidence_int, reason, errors

    # Major DOB Mismatch Override for Identity
    if document_type == 'identity' and scores_dict.get('dob_match_score', 100.0) < 40.0:
        decision = 'rejected'
        reason = "major_dob_mismatch: The date of birth on the uploaded document does not match your registered profile date of birth."
        errors.append(reason)
        return decision, confidence_int, reason, errors

    if not is_type_valid:
        decision = 'rejected' if type_confidence > 75.0 else 'manual_review'
        reason = f"document_type_mismatch: {type_mismatch_reason}"
        errors.append(type_mismatch_reason)
        return decision, confidence_int, reason, errors

    # Major Address Mismatch Override for Residence
    if document_type == 'residence' and scores_dict.get('address_match_score', 100.0) < 40.0:
        decision = 'rejected'
        reason = "major_address_mismatch: The address on the uploaded document does not match your registered profile address. Please upload an address proof matching your profile address."
        errors.append(reason)
        return decision, confidence_int, reason, errors

    # 3. Apply Threshold Rules
    approved_threshold = DECISION_THRESHOLDS['APPROVED']
    review_threshold = DECISION_THRESHOLDS['MANUAL_REVIEW']

    if confidence_int >= approved_threshold:
        # Authenticity Disclaimer Constraint:
        # Local OCR alone cannot guarantee 100% government authenticity.
        # If any quality or name matching warnings exist, require manual review.
        if warnings:
            decision = 'manual_review'
            reason = f"High confidence ({confidence_int}%), but flagged for manual review due to warnings: {'; '.join(warnings)}"
        else:
            decision = 'approved'
            reason = f"Automatically approved with confidence score {confidence_int}%"
    elif confidence_int >= review_threshold:
        decision = 'manual_review'
    else:
        decision = 'rejected'
        reason = f"Automatically rejected due to low confidence score ({confidence_int}% < {review_threshold}%)."

    return decision, confidence_int, reason, errors


def format_human_readable_reason(reason, errors=None, user_name=None):
    """
    Translates raw verification error codes and reasons into a clear, user-facing explanation.
    """
    if not reason:
        return "Document verification complete."

    r = str(reason).lower()

    if "major_name_mismatch" in r or "name mismatch" in r:
        if user_name:
            return f"The name on the uploaded document does not match your registered profile name ('{user_name}'). Please upload a document belonging to {user_name}."
        return "The name on the uploaded document does not match your registered profile name. Please upload a document belonging to the profile owner."

    if "document_type_mismatch" in r:
        return "The uploaded file does not match the required document format. Please upload a valid document for this request."

    if "major_dob_mismatch" in r:
        return "The date of birth on the uploaded document does not match your registered profile date of birth."

    if "duplicate_document_detected" in r or "duplicate" in r:
        return "This document has already been uploaded by another account."

    if "document_quality_insufficient" in r or "blurry" in r or "unreadable" in r:
        return "The document image quality is insufficient or blurry. Please upload a clear, high-resolution photo or PDF."

    if "approved" in r:
        return "Document successfully verified and approved."

    if errors and len(errors) > 0:
        clean_err = str(errors[0]).replace("major_name_mismatch: ", "").replace("major_dob_mismatch: ", "")
        return f"Verification issue: {clean_err}"

    return str(reason)
