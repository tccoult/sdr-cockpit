# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript + Vite UI, including `src/components/`, `src/plot/`, and generated types in `src/types/generated/`.
- `backend/`: FastAPI service with routes in `app/api/routes/`, WebSocket handling in `app/api/websocket.py`, and models in `app/models/`.
- `simulator/`: Python mock SDR data generator.
- `api/`: OpenAPI spec (`openapi.yaml`) with schemas in `api/schemas/` (source of truth for types).
- `scripts/`: Dev, test, build, and deployment helpers.
- `docs/`, `docker/`, and `docker-compose*.yml`: documentation and deployment assets.

## Build, Test, and Development Commands
- `./scripts/setup.sh`: install dependencies (first-time setup).
- `./scripts/dev.sh`: run frontend + backend with hot reload.
- `./scripts/test.sh`: quick full test pass across components.
- `./scripts/check.sh`: full CI-style checks (lint, type-check, test, build).
- Component checks: `./scripts/check-frontend.sh`, `./scripts/check-backend.sh`, `./scripts/check-simulator.sh`.
- Type generation: `./scripts/generate-types.sh` (syncs `api/openapi.yaml` to frontend/back-end types).

## Coding Style & Naming Conventions
- Follow existing patterns; reuse utilities before adding new ones.
- Frontend: use Tailwind theme colors/CSS variables only (no hardcoded hex). See `frontend/tailwind.config.js` and `frontend/src/index.css`.
- Prefer clear, descriptive names that match surrounding code.

## Testing Guidelines
- Favor high-value tests over quantity; avoid brittle tests.
- Focus on critical behavior and edge cases.
- Run `./scripts/check.sh` before committing.

## Commit & Pull Request Guidelines
- Commit messages are concise, imperative, sentence-case (e.g., "Optimize BIT storage: ...").
- PRs should include a clear description, testing notes, and screenshots for UI changes.

## Development Workflow Expectations
- Plan before coding; read relevant code for context and ask questions when unsure.
- Implement with cohesion: align UI changes with existing components and avoid duplication.
- Self-review for bugs, error handling, dead code, and style consistency.

## Pre-Commit Checklist
- Mandatory: `./scripts/check.sh` must pass (frontend + backend + simulator).
- Remove any dead code introduced during the change.
