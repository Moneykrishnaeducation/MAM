# MAM

This project was created with [Better Fullstack](https://github.com/Marve10s/Better-Fullstack), a high-performance Python stack.

## Features

- **Python** - Modern, readable programming language
- **Django** - High-level Python web framework with batteries included
- **Tortoise ORM** - Async-first Python ORM with Django-like API
- **Aerich** - Database migrations for Tortoise ORM
- **Pydantic** - Data validation using Python type hints
- **pydantic-settings** - Settings management with environment variables
- **Requests** - Retrying synchronous HTTP session helper
- **Pillow** - Image thumbnail helper
- **Gunicorn** - Production process manager
- **Confluent Kafka** - JSON event producer helper
- **Django Ninja** - FastAPI-style Django APIs with type hints and OpenAPI docs
- **Ruff** - Extremely fast Python linter and formatter

## Prerequisites

- [Python](https://www.python.org/) 3.11 or higher
- [uv](https://docs.astral.sh/uv/)

## Getting Started

First, copy the environment file:

```bash
cp .env.example .env
```

Then, install dependencies:

```bash
uv sync --extra dev
```

Start the Django development server:

```bash
uv run python -m app.main
```

The application will be running at [http://localhost:8000](http://localhost:8000).

## Project Structure

```
MAM/
├── pyproject.toml        # Project configuration and dependencies
├── src/
│   └── app/
│       ├── __init__.py
│       └── main.py       # Application entry point
│       ├── settings.py   # Application settings (pydantic-settings)
│       ├── database.py   # Database configuration
│       ├── models.py     # Tortoise ORM models
│       └── crud.py       # CRUD operations
│       ├── http_client.py # Retrying Requests session
│       ├── media.py      # Pillow image helpers
│       ├── kafka.py      # Confluent Kafka producer
├── tests/
│   ├── __init__.py
│   └── test_main.py      # Test suite
│   └── test_database.py  # Database tests
├── .env.example          # Environment variables template
└── .gitignore
```

## Available Commands

- `uv run python -m app.main`: Start Django dev server
- `uv run pytest`: Run tests
- `uv run gunicorn app.main:application`: Start the production server
- `uv run ruff check .`: Run linter
- `uv run ruff format .`: Format code
- `uv run aerich init -t app.database.TORTOISE_ORM`: Initialize Aerich
- `uv run aerich init-db`: Create initial migration
- `uv run aerich migrate`: Generate migration
- `uv run aerich upgrade`: Apply migrations


