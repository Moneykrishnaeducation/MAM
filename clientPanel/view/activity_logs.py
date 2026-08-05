"""Client activity log endpoint."""

from django.http import JsonResponse

from adminPanel.models import ActivityLog
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


def _serialize_activity_log(log: ActivityLog) -> dict:
    return {
        "id": log.id,
        "action": log.action,
        "details": log.details,
        "ip_address": log.ip_address,
        "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None,
    }


@permission_required(IsClient)
async def get_client_activity_logs(request):
    """Return the most recent five activity logs for the authenticated client."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    activity_logs = await ActivityLog.filter(user_email__iexact=profile.email).order_by("-created_at").limit(5)

    return JsonResponse(
        {
            "status": "ok",
            "activity_logs": [_serialize_activity_log(log) for log in activity_logs],
        }
    )
