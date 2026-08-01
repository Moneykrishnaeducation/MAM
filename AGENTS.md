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
│   └── view/        # Client-specific view modules such as login, profile, account
├── tests/           # Test suite
└── migrations/      # Aerich database migrations
```

## Common Commands

- `uv sync --extra dev` - Install dependencies
- `uv run python -m backendPanel.main` - Run application (uvicorn ASGI server, auto-creates database schemas on startup via `Tortoise.generate_schemas(safe=True)`)
- `uv run uvicorn backendPanel.asgi:application --reload` - Run with uvicorn directly
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
