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

**IMPORTANT:** Maintain color harmony by using theme colors instead of hardcoded hex values.

### Preferred Approach

1. **Use Tailwind classes** whenever possible:
   - Status colors: `emerald-500`, `amber-500`, `red-500`, `sky-500`, `rose-500`
   - Neutrals: `slate-*` scale (50-950)
   - Brand/interactive: `cockpit-accent` (defined in `tailwind.config.js`)

2. **Use shared utilities** for complex cases:
   - Visualization colors: `getVisualizationTheme()` from `frontend/src/components/visualization/theme.ts`
   - Status indicators: `getHealthIndicator()` from `frontend/src/utils/statusColors.ts`

3. **Avoid hardcoded hex values** except when:
   - Inline styles require rgba manipulation
   - Scientific colormaps (e.g., PLASMA for waterfall displays)

### Color Palette Reference

**Status Colors:**
- Success/Live/Healthy: `emerald-500` (#10b981) — NOT `green-500`
- Warning/Paused: `amber-500` (#f59e0b)
- Error/Failed: `red-500` (#ef4444)
- Transmitting: `sky-500` (#0ea5e9)
- Recording: `rose-500` (#f43f5e)
- Stopped/Neutral: `slate-500` (#64748b)

**Brand Colors:**
- Primary/Interactive: `cockpit-accent` (#7c83ff) — violet theme

**Before Adding Colors:**
- Check if a similar use case exists in the codebase
- Reuse existing Tailwind classes or shared utilities
- Keep the violet/indigo theme consistent across UI elements
