"""Helpers for locating the exported frontend static files."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Drop-in location for the exported frontend.
STATIC_FRONTEND_DIR = BASE_DIR / "static" / "frontend"


def get_frontend_static_dirs() -> list[Path]:
    """Return the frontend static directory when it exists."""
    if STATIC_FRONTEND_DIR.exists():
        return [STATIC_FRONTEND_DIR]
    return []


def iter_frontend_candidates(route: str) -> list[str]:
    """Build the possible frontend file paths for a route."""
    clean_route = route.strip("/")
    if not clean_route:
        return ["index.html"]

    return [
        f"{clean_route}.html",
        f"{clean_route}/index.html",
        clean_route,
        "index.html",
    ]
