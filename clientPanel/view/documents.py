"""Client document endpoint."""

from __future__ import annotations

from pathlib import Path
import json

from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import (
    _error,
    _get_client_profile_for_request,
    build_document_details_payload,
    build_document_submission_payload,
    create_document_pending_request,
    get_client_document_details,
    get_latest_document_request,
)


def _normalize_document_type(value: str | None) -> str | None:
    normalized = str(value or "").strip().lower()
    if normalized in {"identity", "address"}:
        return normalized
    return None


def _save_uploaded_document(uploaded_file, profile_id: int, document_type: str) -> tuple[str, str]:
    original_name = Path(getattr(uploaded_file, "name", "") or "document").name
    relative_path = f"client_documents/{profile_id}/{document_type}/{original_name}"
    saved_path = default_storage.save(relative_path, uploaded_file)
    file_url = default_storage.url(saved_path)
    return saved_path, file_url


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["GET", "POST"])
async def client_documents(request):
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    document_detail = await get_client_document_details(profile)
    identity_request = await get_latest_document_request(profile, "identity")
    address_request = await get_latest_document_request(profile, "address")

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "documents": build_document_details_payload(
                    profile=profile,
                    document_detail=document_detail,
                    identity_request=identity_request,
                    address_request=address_request,
                ),
            }
        )

    document_type = _normalize_document_type(request.POST.get("documentType") or request.POST.get("document_type"))
    if document_type is None:
        try:
            body = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            body = {}
        document_type = _normalize_document_type(body.get("documentType") or body.get("document_type"))
        if document_type is None:
            return _error("documentType must be either 'identity' or 'address'", status=400)
    uploaded_file = (
        request.FILES.get("documentFile")
        or request.FILES.get("file")
        or request.FILES.get("document")
        or next(iter(request.FILES.values()), None)
    )
    if uploaded_file is None:
        return _error("documentFile is required", status=400)

    file_path, file_url = _save_uploaded_document(uploaded_file, profile.id, document_type)

    try:
        submission_payload = build_document_submission_payload(
            profile=profile,
            body={"documentType": document_type},
            file_name=str(getattr(uploaded_file, "name", "") or "document").strip() or "document",
            file_path=file_path,
            file_url=file_url,
            content_type=getattr(uploaded_file, "content_type", None),
            file_size=getattr(uploaded_file, "size", None),
        )
    except ValueError as exc:
        return _error(str(exc), status=400)

    pending_request = await create_document_pending_request(profile, submission_payload)

    identity_request = await get_latest_document_request(profile, "identity")
    address_request = await get_latest_document_request(profile, "address")

    return JsonResponse(
        {
            "status": "ok",
            "message": "Document submitted for approval",
            "request_id": pending_request.id,
            "documents": build_document_details_payload(
                profile=profile,
                document_detail=document_detail,
                identity_request=identity_request,
                address_request=address_request,
            ),
        }
    )
