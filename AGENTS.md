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
- `clientPanel/view/reset_password.py` now supports emailed password reset links via `/api/client/request-password-reset` and token-based completion via `/api/client/reset-password`, and the frontend includes a `/client/reset-password` page for link follow-through.
- `clientPanel/view/profile.py`, `clientPanel/view/documents.py`, and `clientPanel/view/payment_details.py` now send submission emails for profile edits, identity/address proof uploads, and bank/crypto payment-detail updates when a client submits a pending request.
- `templates/emails/profile_update_notification_email.*`, `templates/emails/document_submission_notification_email.*`, and `templates/emails/payment_details_submission_notification_email.*` hold the client-facing request-submission email templates used by those flows.
- `Frontend/apps/web/src/lib/authApiInterceptor.ts` installs a browser-wide API fetch interceptor that logs out the current admin or client session on `403`/`404` responses from browser API calls, using the current app area or request path to choose the logout endpoint.
- `backendPanel/mail_queue.py` now stores outbound mail in the database-backed `admin_mail_messages` queue, and `adminPanel/management/commands/process_mail_queue.py` can be run as a separate worker to flush queued mail.
- `adminPanel/management/commands/mail_worker.py` is the continuous mail queue worker you can run as a separate process, while `process_mail_queue` remains a one-shot manual flush command.
- `backendPanel/asgi.py` no longer starts the mail queue automatically, so the main web server stays separate from mail delivery.
- `adminPanel/view/mam_accounts.py` now sends branded MT5 credential emails to the related client after MAM or investor account creation, including the login, group, and generated passwords.
- `templates/emails/mam_credentials_email.html` and `templates/emails/mam_credentials_email.txt` hold the standalone MAM credential email templates rendered by `adminPanel/view/mam_accounts.py`.
- `adminPanel/view/dashboard.py` provides the admin dashboard API used by `/api/admin/dashboard`.
- `adminPanel/view/pending_requests.py` provides the admin-only request-tab APIs under `/api/admin/requests/...`.
- `adminPanel/view/client_profile.py` provides the admin-only client profile update API under `/api/admin/users/<user_id>/profile`.
- `adminPanel/view/client_transactions.py` provides the admin-only client transaction history API under `/api/admin/users/<user_id>/transactions`.
- `adminPanel/view/transactions.py` provides the admin-only main transactions page API under `/api/admin/transactions`, including tab filtering and summary counts.
- `adminPanel/urls.py` now wraps every adminPanel route with `IsAdmin` via a shared `admin_only` wrapper, so all admin APIs in that URL file require an admin role.
- `clientPanel/urls.py` now wraps the authenticated client routes with `IsClient` via a shared `client_only` wrapper, while keeping password-reset and logout endpoints public.
- `adminPanel/view/client_tickets.py` provides the admin-only client support ticket history API under `/api/admin/users/<user_id>/tickets`.
- `adminPanel/views.py` now includes KYC/document payloads in `/api/admin/users` and exposes `/api/admin/users/<user_id>/kyc` for lazy-loading the row expansion data from `client_profiles` and `client_documents`.
- `adminPanel/views.py` now exposes category-specific activity APIs under `/api/admin/activity/admin`, `/api/admin/activity/client`, and `/api/admin/activity/error`, while `/api/admin/activity` remains the full activity feed.
- `adminPanel/models.py` now maps `ActivityLog` to the `admin_activity_logs` table with `user_name`, `user_role`, `action_type`, `module_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `timestamp`, and `user_id`.
- `adminPanel/audit.py` centralizes best-effort audit log creation for auth events, and login/logout handlers now record `Login` and `Logout` actions for both admin and client sessions.
- `adminPanel/models.py` now includes `ClientBankDetail` and `ClientCryptoDetail`, and the payment detail endpoints live at `/api/client/payment-details` and `/api/admin/users/<user_id>/payment`.
- `adminPanel/models.py` now uses `client` as the unified user table; admin accounts are stored there with `role="Admin"` and the old `admin_users` model/table is no longer used by the code.
- `adminPanel/models.py` now stores KYC documents in `client_documents.user_id` (linked to `ClientUser`) and startup backfills any legacy `client_profile_id` rows into the new column.
- Client onboarding now bootstraps a matching `ClientProfile`, and client login backfills a missing profile before issuing a session token.
- `backendPanel.settings` now carries SMTP fields, and `adminPanel/view/mail.py` exposes `/api/admin/mails` for listing drafts/sends and composing SMTP-backed admin emails.
