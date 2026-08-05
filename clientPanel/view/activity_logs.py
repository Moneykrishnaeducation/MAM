"""Client activity log endpoint."""

from django.http import JsonResponse

from adminPanel.models import ActivityLog
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


def _serialize_activity_log(log: ActivityLog) -> dict:
    return {
        "id": log.id,
        "action": log.action_type,
        "details": f"{log.module_name}{f' #{log.record_id}' if log.record_id else ''}",
        "user_name": log.user_name,
        "user_role": log.user_role,
        "action_type": log.action_type,
        "module_name": log.module_name,
        "record_id": log.record_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
        "time": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
    }


@permission_required(IsClient)
async def get_client_activity_logs(request):
    """Return the most recent five activity logs for the authenticated client."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    activity_logs = await ActivityLog.filter(user_id=profile.user_id).order_by("-timestamp").limit(5)

    return JsonResponse(
        {
            "status": "ok",
            "activity_logs": [_serialize_activity_log(log) for log in activity_logs],
        }
    )
