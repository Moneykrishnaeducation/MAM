# MAM

This project was created with [Better Fullstack](https://github.com/Marve10s/Better-Fullstack), a high-performance Python stack.

## Features

- **Python** - Modern, readable programming language (>=3.11)
- **Django** - High-level Python web framework
- **PostgreSQL** - Production database support (`django.db.backends.postgresql` with `psycopg2-binary` & `asyncpg`)
- **Tortoise ORM** - Async-first Python ORM with Django-like API
- **Aerich** - Database migrations for Tortoise ORM
- **Django Ninja** - FastAPI-style Django APIs with type hints and OpenAPI docs
- **Strawberry GraphQL** - GraphQL API integration for Django
- **Pydantic & pydantic-settings** - Data validation and environment variable settings management
- **FastAPI Users** - Authentication management
- **Requests & Pillow** - HTTP sessions with retries and image processing helpers
- **Confluent Kafka & Upstash Redis** - Event streaming and caching
- **Ruff** - Fast Python linter and formatter

## Prerequisites

- [Python](https://www.python.org/) 3.11 or higher
- [uv](https://docs.astral.sh/uv/)
- [PostgreSQL](https://www.postgresql.org/) (optional, defaults to local PostgreSQL or SQLite)

## Getting Started

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your database settings in `.env`:
   ```env
   DB_ENGINE=django.db.backends.postgresql
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/VT
   DB_NAME=VT
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_CONN_MAX_AGE=600
   DB_CONN_HEALTH_CHECKS=true
   DB_ATOMIC_REQUESTS=false
   ```

3. Install dependencies:
   ```bash
   uv sync --extra dev
   ```

4. Run database migrations:
   ```bash
   # Django migrations
   uv run python manage.py migrate

   # Tortoise ORM migrations (Aerich)
   uv run aerich init-db
   ```

5. Start the development server:
   ```bash
   uv run python -m app.main
   ```

   The application will be running at [http://localhost:8000](http://localhost:8000).

## Project Structure

```
MAM/
├── pyproject.toml        # Project configuration and dependencies
├── manage.py             # Django management entry point
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py       # Application entry point & Django URLs
│       ├── settings.py   # Application settings (pydantic-settings & DATABASES)
│       ├── database.py   # Tortoise ORM database configuration
│       ├── models.py     # Tortoise ORM models
│       ├── crud.py       # CRUD operations
│       ├── users.py      # User authentication management
│       ├── graphql_schema.py # Strawberry GraphQL schema
│       ├── observability.py  # Sentry integration
│       ├── http_client.py    # Retrying Requests session
│       ├── media.py          # Pillow image helpers
│       ├── kafka.py          # Confluent Kafka producer
│       ├── realtime.py       # Socket.IO handlers
│       └── search.py        # Meilisearch client
├── tests/
│   ├── __init__.py
│   ├── test_main.py      # Endpoint test suite
│   ├── test_database.py  # Database & CRUD tests
│   └── test_properties.py# Property-based tests (Hypothesis)
├── migrations/           # Aerich database migrations
├── .env.example          # Environment variables template
└── .gitignore
```

## Available Commands

- `uv run python -m app.main`: Start development server
- `uv run python manage.py migrate`: Apply Django database migrations
- `uv run pytest`: Run test suite
- `uv run ruff check .`: Run linter
- `uv run ruff format .`: Format codebase
- `uv run gunicorn app.main:application`: Start production WSGI server
- `uv run waitress-serve app.main:application`: Start production Waitress server
- `uv run aerich init-db`: Initialize Aerich database migrations
- `uv run aerich migrate`: Generate new Tortoise ORM migration script
- `uv run aerich upgrade`: Apply Tortoise ORM migrations
