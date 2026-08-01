"""Client profile endpoint."""

from django.http import JsonResponse

from clientPanel.view.common import _get_client_profile_for_request, _serialize_client_profile


async def get_client_profile(request):
    """Load profile for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    return JsonResponse({"status": "ok", "profile": _serialize_client_profile(profile)})
