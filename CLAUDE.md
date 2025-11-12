# Claude Code Instructions for SDR Cockpit

## Pre-Commit Checklist

**MANDATORY:** Before every `git commit`, you MUST:

1. Run all checks:

   ```bash
   ./scripts/check.sh
   ```

2. Ensure all checks pass:

   - ✅ Frontend: lint, type-check, test, build
   - ✅ Backend: lint, format check, type-check, test
   - ✅ Simulator: test

3. Only commit if all checks pass

## Workflow

When making changes:

1. Write/modify code
2. Run `./scripts/check.sh`
3. Fix any issues
4. Run `./scripts/check.sh` again
5. When all checks pass → commit
6. Push to remote

## Testing Shortcuts

- Quick test only: `./scripts/test.sh`
- Full checks: `./scripts/check.sh`
- Component-specific:
  - `./scripts/check-frontend.sh`
  - `./scripts/check-backend.sh`
  - `./scripts/check-simulator.sh`

## Color Usage Guidelines

**IMPORTANT:** Always use Tailwind theme colors from `tailwind.config.js` instead of hardcoded hex values.

- Use `status-*` colors for status indicators (success, warning, error, info, transmit, recording, stopped)
- Use `accent` for brand/interactive elements
- Use `slate-*` for neutrals
- Only hardcode colors when absolutely necessary (inline styles with rgba manipulation, canvas rendering)

All theme colors are defined in `frontend/tailwind.config.js`.
