# MAM

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Python

## Tech Stack

- Web Framework: django
- Database: postgresql (`django.db.backends.postgresql`, `psycopg2-binary`, `asyncpg`)
- ORM: tortoise-orm
- Validation: pydantic & pydantic-settings
- API Framework: django-ninja & strawberry-graphql
- Code Quality: ruff

## Project Structure

```
MAM/
├── pyproject.toml   # Project config
├── manage.py        # Django management script
├── backendPanel/    # Core server, settings, main WSGI/ASGI entrypoint, static files
│   └── permissions.py # Role-based request permission helpers
├── adminPanel/      # Admin user management, managers, investors, MAM accounts, requests
│   └── view/        # Admin-specific view modules such as MAM account creation
├── clientPanel/     # Client profile, trading account details, investments, transactions
│   └── view/        # Client-specific view modules such as login, profile, account
├── tests/           # Test suite
└── migrations/      # Aerich database migrations
```

## Common Commands

- `uv sync --extra dev` - Install dependencies
- `uv run python -m backendPanel.main` - Run application (uvicorn ASGI server, auto-creates database schemas and syncs modified table columns on startup via `auto_sync_db_schema()`)
- `uv run uvicorn backendPanel.asgi:application --reload` - Run with uvicorn directly
- `uv run pytest` - Run tests
- `uv run ruff check .` - Run linter
- `uv run ruff format .` - Format code

## Database Schema Management & Model Modifications

- **Automatic Table & Column Synchronization**:
  - The application automatically synchronizes Python model classes (`adminPanel/models.py`) with PostgreSQL during startup in `backendPanel/asgi.py`.
  - **New Tables**: Automatically created via `Tortoise.generate_schemas(safe=True)`.
  - **Modified Tables / Added Fields**: Automatically synchronized via `auto_sync_db_schema()`, which executes `ALTER TABLE "..." ADD COLUMN IF NOT EXISTS "..."` for any new fields or columns added to model classes.
  - **No Manual Migration Commands Required**: Simply edit your Tortoise ORM model classes in `adminPanel/models.py`, save, and start the server (`uv run python -m backendPanel.main`). The database schema updates automatically on startup!

## Maintenance

Keep AGENTS.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.

Recent additions:

- `static/frontend/` is the drop-in location for the exported Next.js frontend build. The backend reads from that directory only.
- `clientPanel/view/login.py` now sets auth cookies for `access_token`, `jwt_token`, `refresh_token`, `role`, plus the legacy session cookie names so the frontend no longer needs `localStorage` for auth state.
- `adminPanel/view/dashboard.py` provides the admin dashboard API used by `/api/admin/dashboard`.
- `adminPanel/view/pending_requests.py` provides the admin-only request-tab APIs under `/api/admin/requests/...`.
- `adminPanel/view/client_profile.py` provides the admin-only client profile update API under `/api/admin/users/<user_id>/profile`.
- `adminPanel/view/client_transactions.py` provides the admin-only client transaction history API under `/api/admin/users/<user_id>/transactions`.
- `adminPanel/view/client_tickets.py` provides the admin-only client support ticket history API under `/api/admin/users/<user_id>/tickets`.
- `adminPanel/models.py` now includes `ClientBankDetail` and `ClientCryptoDetail`, and the payment detail endpoints live at `/api/client/payment-details` and `/api/admin/users/<user_id>/payment`.
- `adminPanel/models.py` now uses `client` as the unified user table; admin accounts are stored there with `role="Admin"` and the old `admin_users` model/table is no longer used by the code.
- Client onboarding now bootstraps a matching `ClientProfile`, and client login backfills a missing profile before issuing a session token.
