# MAM

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Python

## Tech Stack

- Web Framework: django
- ORM: tortoise-orm
- Validation: pydantic
- API Framework: django-ninja
- Code Quality: ruff

## Project Structure

```
MAM/
├── pyproject.toml   # Project config
├── src/
│   └── app/         # Application code
├── tests/           # Test suite
├── migrations/      # Database migrations
```

## Common Commands

- `uv sync --extra dev` - Install dependencies
- `uv run python -m app.main` - Run application
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
