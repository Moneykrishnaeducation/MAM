# MAM (VTIndex Multi-Account Manager)

MAM is a high-performance Multi-Account Management platform powered by Django, Uvicorn ASGI, Tortoise ORM, Upstash Redis, and Next.js.

---

## Features

- **Python & Django Core** — Modern Python stack (`>=3.11`) with Django ASGI framework and standard URL routing (`urls.py`).
- **Uvicorn ASGI Server** — High-throughput async web server (`backendPanel.asgi:application`).
- **Frontend Integration** — Built-in static UI rendering of Next.js export at `http://localhost:8000`.
- **Modular 3-Panel Architecture**:
  - **`backendPanel`**: Core server settings, ASGI entrypoint, master URL router (`urls.py`), static UI file serving, Upstash Redis cache.
  - **`adminPanel`**: Central models (`AdminUser`, `ClientUser`, `Manager`, `Investor`, `MamAccount`, `PendingRequest`, `ActivityLog`), admin views, and URL routing (`urls.py`).
  - **`clientPanel`**: Client profiles, MT5 account details, allocated investments, deposit/withdrawal transactions, support tickets, and client URL routing (`urls.py`).
- **PostgreSQL & Tortoise ORM** — Async Python ORM with automatic schema generation on server startup (`generate_schemas(safe=True)`).
- **Upstash Redis Caching** — High-performance REST Redis cache with seamless in-memory fallback for local development.
- **REST Endpoints** — Clean GET and POST endpoints for user and admin management.
- **Quality Assurance** — Full pytest test suite and Ruff code linting & formatting.

---

## Prerequisites

- [Python](https://www.python.org/) 3.11 or higher
- [uv](https://docs.astral.sh/uv/) package manager
- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) (for building Frontend UI)
- [PostgreSQL](https://www.postgresql.org/) database

---

## Getting Started

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Install Dependencies**:
   ```bash
   uv sync --extra dev
   ```

3. **Build Frontend & Collect Static Files**:
   ```bash
   cd Frontend/apps/web
   npx next build
   cd ../../..
   uv run python manage.py collectstatic --noinput
   ```

   The backend serves the exported site from `static/frontend/`.

4. **Start the Application Server**:
   ```bash
   uv run python -m backendPanel.main
   ```

   Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser to view the VTIndex UI and backend API services!

---

## API Endpoints Overview

### Admin Panel (`/api/admin/`)
- `GET  /api/admin/admin-users` — List system admin users
- `POST /api/admin/admin-users/create` — Create a new system admin user
- `GET  /api/admin/users` — List client users
- `POST /api/admin/users/create` — Create a new client user
- `GET  /api/admin/open-positions/<account_id>/` — Fetch open positions for a trading account
- `GET  /api/admin/users/<user_id>/open-positions` — Fetch open positions for all trading accounts of a user
- `POST /api/admin/accounts/sync-balances` — Trigger MT5 balance sync into DB for all or specific trading accounts
- `GET  /api/admin/requests` — List pending system requests
- `GET  /api/admin/managers` — List MAM managers
- `GET  /api/admin/investors` — List investors
- `GET  /api/admin/activity` — List system activity logs

- `GET  /api/admin/mails` — List admin mail drafts and sent messages
- `POST /api/admin/mails` — Compose, save, or send an admin email

### Client Panel (`/api/client/`)
- `GET  /api/client/profile?user_id=1` — Client user profile
- `GET  /api/client/account?user_id=1` — Trading account details
- `GET  /api/client/open-positions/<account_id>/` — Fetch open positions for a trading account
- `GET  /api/client/my-investments?user_id=1` — Allocated MAM investments
- `GET  /api/client/transactions?user_id=1` — Deposit & withdrawal transactions
- `GET  /api/client/tickets?user_id=1` — Client support tickets

---

## Project Structure

```
MAM/
├── backendPanel/        # Core server, settings, ASGI entrypoint, static files & master URL router
│   ├── settings.py      # App settings (pydantic-settings & DATABASES)
│   ├── main.py          # Uvicorn launcher & app configuration
│   ├── asgi.py          # ASGI application entrypoint & Tortoise lifespan
│   ├── urls.py          # Master URL routing configuration
│   ├── database.py      # Tortoise ORM database configuration
│   ├── cache.py         # Upstash Redis & in-memory cache module
│   └── middleware.py    # Django async middleware
│
├── adminPanel/          # Admin user management & system admin workflows
│   ├── models.py        # Central database models (AdminUser, ClientUser, Manager, etc.)
│   ├── crud.py          # Admin CRUD operations
│   ├── views.py         # Plain async Django view functions
│   └── urls.py          # Admin URL routes (/api/admin/...)
│
├── clientPanel/         # Client user data & trading account management
│   ├── models.py        # Re-exports central database models
│   ├── crud.py          # Client data loaders
│   ├── views.py         # Plain async Django view functions
│   └── urls.py          # Client URL routes (/api/client/...)
│
├── Frontend/            # Next.js frontend web application
│   └── apps/web/        # Web app source & pages
│
├── tests/               # Pytest test suite
│   ├── test_main.py     # Main endpoints & static routing tests
│   ├── test_database.py # Database & CRUD tests
│   ├── test_cache.py    # Cache tests
│   └── test_properties.py # Property-based tests
│
├── pyproject.toml       # Project configuration & dependencies
└── manage.py            # Django management script
```

---

## Available Commands

- **Run Development Server**:
  ```bash
  uv run python -m backendPanel.main
  # or directly with uvicorn
  uv run uvicorn backendPanel.asgi:application --reload
  ```

- **Build Next.js UI & Collect Static Files**:
  ```bash
  cd Frontend/apps/web; npx next build; cd ../../..
  uv run python manage.py collectstatic --noinput
  ```

- **Run Code Quality Checks & Tests**:
  ```bash
  uv run ruff check .
  uv run ruff format .
  uv run pytest
  ```

---

## Database Schema Management & Model Modifications

The application automatically synchronizes Python model definitions in `adminPanel/models.py` with PostgreSQL on server startup (`backendPanel/asgi.py`):

1. **New Tables**: Automatically created on startup via `Tortoise.generate_schemas(safe=True)`.
2. **Modifying Existing Models / Adding Fields**:
   - Automatically detected and synchronized via `auto_sync_db_schema()`.
   - On startup, the server compares all model fields against PostgreSQL and executes `ALTER TABLE "..." ADD COLUMN IF NOT EXISTS "..."` for any new or modified fields.
3. **Developer Workflow**:
   - Simply add or edit fields in `adminPanel/models.py` and save the file.
   - Run or restart the server (`uv run python -m backendPanel.main`).
   - The PostgreSQL database schema updates automatically with no manual migration CLI commands required!


  All files compile cleanly. Here's a summary of everything that was changed:          
  ──────                                                                               
  ## Summary of Changes                                                                
                                                                                       
  ### Role System Design                                                               
                                                                                       
   Role           │ Access Level  │ Description
  ────────────────┼───────────────┼────────────────────────────────────────────────────
   SuperAdmin     │ Full          │ Can manage all users, settings, and other admins
   Admin          │ Standard      │ Normal admin operations, cannot manage SuperAdmins
   Viewer         │ Read-only     │ Can only view data, no write operations
  ──────                                                                               
  ### Files Changed                                                                    
                                                                                       
  **permissions.py** — Complete rewrite:                                               
                                                                                       
  • Added role constants: ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_VIEWER, ROLE_CLIENT        
  • Added _canonical_admin_role() — normalizes "Admin", "SuperAdmin", "Super Admin" →  
  canonical lowercase                                                                  
  • _extract_role_from_request() now reads the exact role from the JWT token (not just 
  "is admin or not")                                                                   
  • New permission classes: IsSuperAdmin, IsAdminOrSuperAdmin, IsViewer                
  • IsAdmin now allows all three admin roles (Admin, SuperAdmin, Viewer)               
  • New require_role(*roles) decorator for fine-grained view-level control             
  • New get_request_role(request) public helper                                        
                                                                                       
  **login.py** — Admin login rewritten:                                                
                                                                                       
  • Checks AdminUser table first (not ClientUser)                                      
  • Validates role is one of {Admin, SuperAdmin, Viewer} — returns 403 otherwise       
  • Records last_login timestamp on successful login                                   
  • Exact role (SuperAdmin, Viewer, etc.) stored in cookie + token                     
  • Clients in ClientUser with admin-like roles are rejected (must be in AdminUser)    
                                                                                       
  **views.py** — Fixed to target AdminUser correctly:                                  
                                                                                       
  • create_admin_user — validates role, requires password, normalises email to         
  lowercase, no more bogus verified=True (not in AdminUser schema)                     
  • update_admin_user — queries AdminUser table (was querying ClientUser before),      
  validates role on change                                                             
  • list_admin_system_users — orders by -created_at                                    
  ──────                                                                               
  ### Usage Examples                                                                   
                                                                                       
    from backendPanel.permissions import (                                             
        permission_required, require_role,                                             
        IsSuperAdmin, IsAdminOrSuperAdmin, IsAdmin,                                    
        ROLE_SUPERADMIN, ROLE_ADMIN                                                    
    )                                                                                  
                                                                                       
    # Allow any admin (Admin / SuperAdmin / Viewer) to view                            
    @permission_required(IsAdmin)                                                      
    async def list_users(request): ...                                                 
                                                                                       
    # Only SuperAdmin can delete admin users                                           
    @require_role(ROLE_SUPERADMIN)                                                     
    async def delete_admin_user(request, user_id): ...                                 
                                                                                       
    # Admin + SuperAdmin can create users, but Viewer cannot                           
    @require_role(ROLE_ADMIN, ROLE_SUPERADMIN)                                         
    async def create_user(request): ...     
