# Testing Guide

This document outlines how to run tests locally before pushing code. Following this workflow helps catch issues early and ensures CI will pass.

## Quick Reference

```bash
# Run all tests (from project root)
npm test                           # Frontend tests
python -m pytest backend/tests/    # Backend tests
python -m pytest simulator/tests/  # Simulator tests
docker compose up                  # Integration test (manual verification)
```

## Frontend Testing

**Location:** `frontend/`

### Setup (one time)
```bash
cd frontend
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Type checking
npm run type-check

# Linting (warnings only, won't fail CI)
npm run lint

# Build verification
npm run build
```

### What Gets Tested
- React component rendering
- User interactions
- TypeScript type safety
- Build process

### When to Run
- **Always**: Before committing frontend changes
- **During development**: Use watch mode for instant feedback
- **Before PR**: Run full suite + type-check + build

---

## Backend Testing

**Location:** `backend/`

### Setup (one time)
```bash
cd backend
pip install -r requirements.txt
```

### Run Tests
```bash
# Run all tests (use python -m to ensure proper imports)
python -m pytest -v

# Run specific test file
python -m pytest tests/test_health.py -v

# Type checking
mypy app/

# Linting (warnings only, won't fail CI)
ruff check .
black --check .
```

### What Gets Tested
- API endpoints (FastAPI routes)
- Business logic
- Type safety (mypy)
- Code formatting (black, ruff)

### When to Run
- **Always**: Before committing backend changes
- **After adding endpoints**: Test new API routes
- **Before PR**: Run full suite + mypy

---

## Simulator Testing

**Location:** `simulator/`

### Setup (one time)
```bash
cd simulator
pip install -r requirements.txt
```

### Run Tests
```bash
# Run all tests (use python -m for proper imports)
python -m pytest -v

# Test from project root (how CI runs it)
cd /path/to/sdr-cockpit
python -m pytest simulator/tests/ -v
```

### What Gets Tested
- Data generation functions
- Mode switching (test/random/realistic)
- Configuration handling

### When to Run
- **Always**: Before committing simulator changes
- **Before PR**: Run from root directory to match CI

---

## Docker Build Testing

**Location:** `docker/`

### Build All Images
```bash
# From project root
docker build -f docker/frontend.Dockerfile -t sdr-cockpit-frontend:test .
docker build -f docker/backend.Dockerfile -t sdr-cockpit-backend:test .
docker build -f docker/simulator.Dockerfile -t sdr-cockpit-simulator:test .
```

### What Gets Tested
- Docker image builds successfully
- All dependencies install correctly
- Application starts in container

### When to Run
- **After modifying Dockerfiles**: Verify builds work
- **After dependency changes**: Ensure containers build
- **Before PR**: If you changed Docker-related files

---

## Integration Testing

**Location:** `docker-compose.yml`

### Run Full Stack
```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Manual Verification
1. **Backend health**: `curl http://localhost:8000/health`
2. **Frontend**: Open `http://localhost:3000` in browser
3. **Check logs**: Verify no errors in `docker compose logs`

### What Gets Tested
- All services start successfully
- Services can communicate
- No runtime errors

### When to Run
- **After changing service configuration**: Verify stack works
- **Before major PRs**: Ensure integration works
- **Optional**: Not required for every commit

---

## Pre-Commit Checklist

Before committing, run tests for the components you changed:

### Frontend Changes
- [ ] `npm test` (in frontend/)
- [ ] `npm run type-check`
- [ ] `npm run build`

### Backend Changes
- [ ] `python -m pytest -v` (in backend/)
- [ ] `mypy app/`

### Simulator Changes
- [ ] `python -m pytest -v` (in simulator/)
- [ ] Test from root: `python -m pytest simulator/tests/`

### Docker/Infrastructure Changes
- [ ] Build affected Docker images
- [ ] `docker compose up` to verify integration

---

## CI Workflow

GitHub Actions will run all of the above automatically:

1. **PR Checks**: Runs on every PR
   - Frontend: lint, type-check, test, build
   - Backend: lint, type-check, test
   - Simulator: test
   - Docker: build verification

2. **Integration Tests**: Runs after checks pass
   - Starts all containers
   - Verifies services are healthy

3. **CI/CD (trunk)**: Runs on merge to trunk
   - All checks + integration tests
   - Publishes Docker images to ghcr.io

---

## Troubleshooting

### Frontend Tests Fail
- **Missing dependencies**: Run `npm install`
- **TypeScript errors**: Run `npm run type-check` for details
- **Build errors**: Check `npm run build` output

### Backend Tests Fail
- **Import errors**: Use `python -m pytest` not just `pytest`
- **Missing dependencies**: Run `pip install -r requirements.txt`
- **Type errors**: Run `mypy app/` for details

### Simulator Tests Fail
- **Import errors**: Run from project root or use `python -m pytest`
- **Missing numpy**: Run `pip install -r requirements.txt`

### Docker Build Fails
- **Context errors**: Ensure you're building from project root
- **Path errors**: Check Dockerfile COPY paths match structure
- **Dependency errors**: Update requirements.txt or package.json

---

## Tips for Claude (AI Assistant)

When working on features:

1. **Test as you go**: Run relevant tests after each significant change
2. **Test before committing**: Always run full test suite before `git commit`
3. **Test from root**: Simulator tests must pass when run from project root
4. **Use python -m**: Always use `python -m pytest` for Python tests
5. **Check imports**: If tests fail, verify package structure and imports
6. **Commit dependencies**: Always commit package-lock.json changes
7. **Push early**: Push to see CI results, don't wait until everything is "perfect"

### Common Mistakes to Avoid
- ❌ Running `pytest` directly (use `python -m pytest`)
- ❌ Testing only from component directory (test from root too)
- ❌ Forgetting to commit package-lock.json
- ❌ Using path hacks instead of proper Python packages
- ❌ Not testing Docker builds after Dockerfile changes
