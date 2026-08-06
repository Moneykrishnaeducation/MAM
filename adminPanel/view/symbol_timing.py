"""Symbol market sessions / timing view — ported from VT-Index_CRM."""

import logging

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

# Day index → name mapping (MT5 uses 0 = Sunday … 6 = Saturday)
_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _classify_symbol(path: str) -> str:
    """Classify a symbol based on its MT5 path string."""
    if not path:
        return "other"
    p = path.lower()
    if "forex" in p or "fx" in p:
        return "forex"
    if "crypto" in p or "coin" in p or "btc" in p or "eth" in p:
        return "crypto"
    if "indices" in p or "index" in p:
        return "indices"
    if (
        "commodity" in p
        or "metal" in p
        or "gold" in p
        or "silver" in p
        or "oil" in p
        or "energy" in p
        or "xau" in p
        or "xag" in p
    ):
        return "commodities"
    if "stock" in p or "share" in p or "cfd" in p:
        return "cfd"
    return "other"


def _format_sessions(sym_info, session_type: str) -> list:
    """Return a list of {day, open, close} dicts from an MT5 SymbolInfo object."""
    sessions_list = []
    try:
        raw = sym_info.SessionQuoteGet() if session_type == "quote" else sym_info.SessionTradeGet()
        for day_idx, day_sessions in enumerate(raw):
            day_name = _DAYS[day_idx] if day_idx < len(_DAYS) else f"Day{day_idx}"
            for sess in day_sessions:
                open_str = f"{sess.OpenHours:02d}:{sess.OpenMinutes:02d}"
                close_str = f"{sess.CloseHours:02d}:{sess.CloseMinutes:02d}"
                # Skip empty/midnight-to-midnight placeholder sessions
                if open_str == "00:00" and close_str == "00:00":
                    continue
                sessions_list.append({"day": day_name, "open": open_str, "close": close_str})
    except Exception as exc:
        logger.warning(f"[symbol_timing] Could not read sessions from sym_info: {exc}")
    return sessions_list


@csrf_exempt
@require_http_methods(["GET"])
def symbol_timing(request):
    """
    GET /api/symbol-timing/

    Query parameters:
      symbol  — MT5 symbol name (e.g. EURUSD, JP225).
                Omit to return ALL symbols (cached 60 s).
      type    — 'trade' (default) or 'quote'
    """
    symbol_name = request.GET.get("symbol", "").strip()
    session_type = request.GET.get("type", "trade").lower()

    if session_type not in ("trade", "quote"):
        return JsonResponse(
            {"error": "Query param 'type' must be 'trade' or 'quote'."},
            status=400,
        )

    try:
        from adminPanel.mt5.services import get_manager_instance

        mgr = get_manager_instance()
        if not mgr or not mgr.connected:
            return JsonResponse({"error": "MT5 Manager is not connected."}, status=503)

        manager = mgr.manager  # underlying MT5Manager.ManagerAPI instance

        if symbol_name:
            # ── Single symbol ──────────────────────────────────────────────
            sym_info = manager.SymbolGet(symbol_name)
            if not sym_info:
                return JsonResponse(
                    {"error": f"Symbol '{symbol_name}' not found on MT5."},
                    status=404,
                )
            return JsonResponse(
                {
                    "symbol": symbol_name,
                    "category": _classify_symbol(getattr(sym_info, "Path", "")),
                    "sessions": _format_sessions(sym_info, session_type),
                }
            )

        # ── All symbols (cached) ───────────────────────────────────────────
        cache_key = f"mt5_all_symbol_timings_v2_{session_type}"
        cached = cache.get(cache_key)
        if cached is not None:
            return JsonResponse(cached, safe=False)

        total = manager.SymbolTotal()
        all_data = []
        for i in range(total):
            sym_info = manager.SymbolNext(i)
            if sym_info and getattr(sym_info, "Symbol", None):
                path = getattr(sym_info, "Path", "")
                all_data.append(
                    {
                        "symbol": sym_info.Symbol,
                        "category": _classify_symbol(path),
                        "sessions": _format_sessions(sym_info, session_type),
                    }
                )

        cache.set(cache_key, all_data, 60)  # cache 60 seconds
        return JsonResponse(all_data, safe=False)

    except Exception as exc:
        logger.error(f"[symbol_timing] Error: {exc}", exc_info=True)
        return JsonResponse(
            {"error": "Failed to fetch market sessions.", "details": str(exc)},
            status=500,
        )
