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
├── adminPanel/      # Admin user management, managers, investors, MAM accounts, requests
├── clientPanel/     # Client profile, trading account details, investments, transactions
├── tests/           # Test suite
└── migrations/      # Aerich database migrations
```

## Common Commands

- `uv sync --extra dev` - Install dependencies
- `uv run python -m backendPanel.main` - Run application (uvicorn ASGI server)
- `uv run uvicorn backendPanel.asgi:application --reload` - Run with uvicorn directly
- `uv run python manage.py migrate` - Run Django database migrations
- `uv run aerich init-db` - Initialize Aerich database migrations
- `uv run aerich migrate` - Generate Aerich database migration
- `uv run aerich upgrade` - Apply Aerich database migrations
- `uv run pytest` - Run tests
- `uv run ruff check .` - Run linter
- `uv run ruff format .` - Format code

## Maintenance

Keep AGENTS.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
