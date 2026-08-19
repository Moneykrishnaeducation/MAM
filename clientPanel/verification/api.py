import os
import json
import logging
import asyncio
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request
from clientPanel.view.documents import _save_uploaded_document
from adminPanel.models import ClientDocument

from clientPanel.verification.ocr_engine import check_document_quality, extract_text_from_document
from clientPanel.verification.classifier import classify_document
from clientPanel.verification.identity_verifier import verify_identity_document
from clientPanel.verification.residence_verifier import verify_residence_document
from clientPanel.verification.scoring_engine import evaluate_verification_decision, format_human_readable_reason

logger = logging.getLogger(__name__)

def _run_verification_pipeline(profile, file_path, document_type):
    """Runs the OCR and verification rules dynamically."""
    abs_path = os.path.join(settings.MEDIA_ROOT, file_path)
    
    # 1. Check quality
    quality_metrics = check_document_quality(abs_path)
    
    # 2. Extract OCR
    ocr_text, ocr_engine_used, ocr_confidence = extract_text_from_document(abs_path)
    
    # 3. Classify
    classification_result = classify_document(ocr_text, document_type)
    
    # 4. Fraud dummy (ORM check not possible due to Tortoise/Django mismatch)
    fraud_result = (False, "")
    
    # 5. Extract & Verify
    if document_type == 'identity':
        scores_dict, extracted_data, warnings = verify_identity_document(profile, None, abs_path, ocr_text, quality_metrics)
    else:
        scores_dict, extracted_data, warnings = verify_residence_document(profile, None, abs_path, ocr_text, quality_metrics)
        
    # 6. Evaluate final decision
    decision, final_score, reason, decision_warnings = evaluate_verification_decision(
        document_type=document_type,
        scores_dict=scores_dict,
        quality_metrics=quality_metrics,
        classification_result=classification_result,
        fraud_result=fraud_result,
        warnings=warnings
    )
    
    return decision, final_score, reason, extracted_data, decision_warnings


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def verify_identity_api(request):
    """Endpoint for VT-Index CRM identity verification."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
        
    uploaded_file = (
        request.FILES.get("documentFile")
        or request.FILES.get("file")
        or request.FILES.get("document")
        or next(iter(request.FILES.values()), None)
    )
    if not uploaded_file:
        return JsonResponse({"error": "No document provided"}, status=400)
        
    file_path, file_url = _save_uploaded_document(uploaded_file, profile.id, "identity")

    # Run verification dynamically in a thread to not block event loop
    decision, final_score, reason, extracted_data, warnings = await asyncio.to_thread(
        _run_verification_pipeline, profile, file_path, "identity"
    )
    
    # Save to database
    doc, created = await ClientDocument.get_or_create(user_id=profile.id)
    doc.identity_file_name = uploaded_file.name
    doc.identity_file_path = file_url
    
    status_mapping = {
        'approved': 'approved',
        'manual_review': 'pending',
        'rejected': 'rejected'
    }
    db_status = status_mapping.get(decision, 'pending')
    doc.identity_status = db_status
    doc.identity_uploaded_at = timezone.now()
    await doc.save()

    human_reason = format_human_readable_reason(reason, warnings, profile.full_name)

    response_data = {
        "message": human_reason,
        "human_readable_reason": human_reason,
        "id": doc.id,
        "status": decision,
        "verification_status": decision,
        "confidence_score": final_score,
        "reason": human_reason,
        "verification_reason": human_reason,
        "document_type": "identity",
        "document": file_url,
        "extracted_data": extracted_data,
        "verification_errors": warnings,
        "uploaded_at": doc.identity_uploaded_at.isoformat()
    }
    
    return JsonResponse(response_data, status=201)


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def verify_residence_api(request):
    """Endpoint for VT-Index CRM residence verification."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
        
    uploaded_file = (
        request.FILES.get("documentFile")
        or request.FILES.get("file")
        or request.FILES.get("document")
        or next(iter(request.FILES.values()), None)
    )
    if not uploaded_file:
        return JsonResponse({"error": "No document provided"}, status=400)
        
    file_path, file_url = _save_uploaded_document(uploaded_file, profile.id, "residence")

    # Run verification dynamically in a thread
    decision, final_score, reason, extracted_data, warnings = await asyncio.to_thread(
        _run_verification_pipeline, profile, file_path, "residence"
    )

    # Save to database
    doc, created = await ClientDocument.get_or_create(user_id=profile.id)
    doc.address_file_name = uploaded_file.name
    doc.address_file_path = file_url
    
    status_mapping = {
        'approved': 'approved',
        'manual_review': 'pending',
        'rejected': 'rejected'
    }
    db_status = status_mapping.get(decision, 'pending')
    doc.address_status = db_status
    doc.address_uploaded_at = timezone.now()
    await doc.save()

    human_reason = format_human_readable_reason(reason, warnings, profile.full_name)

    response_data = {
        "message": human_reason,
        "human_readable_reason": human_reason,
        "id": doc.id,
        "status": decision,
        "verification_status": decision,
        "confidence_score": final_score,
        "reason": human_reason,
        "verification_reason": human_reason,
        "document_type": "residence",
        "document": file_url,
        "extracted_data": extracted_data,
        "verification_errors": warnings,
        "uploaded_at": doc.address_uploaded_at.isoformat()
    }
    
    return JsonResponse(response_data, status=201)
