# MAM (VTIndex Multi-Account Manager)

MAM is a high-performance Multi-Account Management platform powered by Django, Django Ninja, Strawberry GraphQL, Tortoise ORM, and Next.js.

## Features

- **Python & Django Core** - Modern Python stack (>=3.11) with Django and Django Ninja REST APIs.
- **Frontend Integration** - Built-in static UI rendering of Next.js static export at `http://localhost:8000`.
- **Modular 3-Panel Architecture**:
  - **`backendPanel`**: Core server settings, WSGI/ASGI entrypoint, Ninja API hub, and static UI file serving.
  - **`adminPanel`**: Admin users, MAM accounts, managers, investors, and pending system request workflows.
  - **`clientPanel`**: Client profile data, MT5 account details, allocated investments, deposit/withdrawal transactions.
- **PostgreSQL & Tortoise ORM** - Async-first Python ORM with Aerich database migrations.
- **GraphQL API** - Integrated Strawberry GraphQL schema.
- **Quality Assurance** - Full pytest test suite and Ruff code linting & formatting.

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
   cd Frontend
   bun run build
   cd ..
   uv run python manage.py collectstatic --noinput
   ```

4. **Run Database Migrations**:
   ```bash
   uv run python manage.py migrate
   ```

5. **Start the Application Server**:
   ```bash
   uv run python -m backendPanel.main
   ```

   Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser to view the VTIndex UI and backend services!

---

## Project Structure

```
MAM/
├── backendPanel/        # Core server, settings, WSGI entrypoint, static files & API hub
│   ├── settings.py      # App settings (pydantic-settings & DATABASES)
│   ├── main.py          # Application entrypoint & static UI serving
│   ├── database.py      # Tortoise ORM database configuration
│   └── cache.py, http_client.py, kafka.py, realtime.py, search.py, observability.py
│
├── adminPanel/          # Admin user management & system admin workflows
│   ├── models.py        # AdminUser, Manager, Investor, MamAccount, PendingRequest models
│   ├── crud.py          # Admin CRUD operations
│   ├── views.py         # Admin Ninja API router (/api/admin/...)
│   └── users.py         # Admin authentication routines
│
├── clientPanel/         # Client user data & trading account management
│   ├── models.py        # ClientProfile, ClientAccount, MyInvestment, ClientTransaction models
│   ├── crud.py          # Client CRUD operations
│   └── views.py         # Client Ninja API router (/api/client/...)
│
├── Frontend/            # Next.js frontend web app
│   └── apps/web/        # Next.js web application
│
├── tests/               # Pytest test suite
│   ├── test_main.py     # Main endpoints & static routing tests
│   ├── test_database.py # Database & CRUD tests
│   └── test_properties.py # Property-based tests
│
├── pyproject.toml       # Project configuration
├── manage.py            # Django management script
└── staticfiles/         # Collected static export UI files
```

---

## Available Commands

- **Run Development Server**:
  ```bash
  uv run python -m backendPanel.main
  # or
  uv run python manage.py runserver
  ```

- **Build Next.js UI & Collect Static Files**:
  ```bash
  cd Frontend; bun run build; cd ..
  uv run python manage.py collectstatic --noinput
  ```

- **Run Code Quality Checks**:
  ```bash
  uv run ruff check .
  uv run ruff format .
  uv run pytest
  ```

- **Database Migrations**:
  ```bash
  uv run python manage.py migrate
  uv run aerich init-db
  uv run aerich migrate
  uv run aerich upgrade
  ```

- **Production WSGI/Waitress Deployments**:
  ```bash
  uv run gunicorn backendPanel.main:application
  uv run waitress-serve backendPanel.main:application
  ```
