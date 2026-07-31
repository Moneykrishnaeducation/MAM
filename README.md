# MAM

This project was created with [Better Fullstack](https://github.com/Marve10s/Better-Fullstack) using the multi-ecosystem project graph.

## Stack

- Frontend: next (typescript)
- Backend: Python Django (python)

## Project Structure

```text
MAM/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend application
└── package.json     # Root scripts for the generated graph
```

## Local Development

Install the JavaScript workspace dependencies first. If you created the project with `--no-install`, this step has not run yet.

```sh
bun install
```

Prepare the backend dependencies and database state before starting the server:

```sh
cd apps/server && uv sync --extra dev
```

Database-backed backend selections expect a local postgres database or a matching `DATABASE_URL` in the backend environment before you start the server. Copy the backend `.env.example` to `.env` and adjust it for your machine.

Run the generated apps in separate terminals so each ecosystem keeps its native watcher and logs.

```sh
bun dev:web
```

Start the backend:

```sh
cd apps/server && uv run python src/app/main.py
```

The frontend is configured to call the backend at `http://localhost:8000`. The generated health check reads the matching public server URL from the web environment file and targets `/health`.

## Root Scripts

- `dev` starts the primary generated workspace for graph projects.
- `dev:web` starts the frontend workspace.

- `setup:server` installs or prepares backend dependencies.
- `dev:server` starts the generated backend.
- `check:server` runs the backend compile/check lane.
- `test:server` runs backend tests.

## Compatibility Notes

- TypeScript frontends can be generated with Elixir Phoenix backends; Phoenix runs on port 4000 and exposes `/api/health`.
- Astro frontends can be generated with Rust backends; Rust web servers run on port 3000 and expose `/health`.
- Cross-ecosystem graph projects share an HTTP boundary. Framework-specific API clients such as tRPC are not assumed across language boundaries; the scaffold wires the frontend to the backend base URL and health endpoint.
