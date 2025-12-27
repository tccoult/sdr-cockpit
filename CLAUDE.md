# Claude Code Instructions for SDR Cockpit

## Development Process

### 1. Planning & Design Phase

**Before writing any code:**

- Create a plan in memory
- Review ALL relevant code - read more than you think you should to get appropriate surrounding context
- Never make assumptions without reviewing the actual implementation
- Come back with the plan + any additional supporting questions
- Expect a back-and-forth for a couple prompts to resolve questions and dig further into the design

### 2. Implementation Phase

**Once the design is approved:**

- If questions arise during implementation, raise them rather than assuming answers
- Follow the style of the codebase
- For frontend work: ensure UI is cohesive with existing components
- Look for existing common code/functions and avoid unnecessary duplication
- Reuse existing patterns and utilities where possible

### 3. Testing Philosophy

**High-value tests only:**

- Less is more
- Write tests that provide real value
- Avoid tests that break on minor refactors
- Focus on tests that verify critical behavior and edge cases

### 4. Self-Review Process

**After completing the first round of code:**

- Do a subsequent self-review
- Check for:
  - Bugs and edge cases
  - Code style consistency
  - Error handling
  - Dead code removal
- Ensure code is production-ready

### 5. Code Quality Principle

**Above all: No sloppy code**

- Code must be maintainable
- Code must be well-organized
- Code is not throw-away - it's production code

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

4. Give a final review of any dead code that may have been left around during your updates. Remove dead code.

## Testing Shortcuts

- Quick test only: `./scripts/test.sh`
- Full checks: `./scripts/check.sh`
- Component-specific:
  - `./scripts/check-frontend.sh`
  - `./scripts/check-backend.sh`
  - `./scripts/check-simulator.sh`

## Code Style Guidelines

### Color Usage

**IMPORTANT:** Always use Tailwind theme colors / CSS variables instead of hardcoded hex values.

All theme colors are defined in `frontend/tailwind.config.js` and `frontend/src/index.css`.
