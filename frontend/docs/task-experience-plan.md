# Task Experience Revamp Plan

## Objective Overview
Enhance the SDR cockpit's task management experience so operators can quickly identify the active task feeding downstream visualizations, monitor numerous concurrent tasks created by different sources, and accommodate future telemetry modules (utilization, detections, tracks, health) without overwhelming the layout. All changes must leverage shared Tailwind-based primitives and be split into focused, maintainable React components.

## Guiding Principles
- **Clarity first:** emphasize the currently observed task while keeping the roster scannable under heavy load.
- **Modular layout:** allow telemetry/status panels to live in left, top, or future right rails without major rework.
- **Reusable primitives:** prefer shared Tailwind-styled components over bespoke inline styles.
- **Maintainability:** keep files small, use composable components/hooks, and document responsibilities in code comments when appropriate.

## Proposed Tasks

### 1. Reframe cockpit layout for distributed status and task focus
- Audit existing layout primitives under `frontend/src/components/layout/` (or introduce them) to support placing panels in the left rail, top bar, and potential right rail.
- Define a layout contract that reserves space for:
  - **Active Task Spotlight** (high-signal operator focus)
  - **Task Roster** (all running tasks, regardless of creator)
  - **System Telemetry Panels** (applications, utilization, detections, tracks, health)
- Implement the layout using Tailwind grid/flex utilities and export composable containers (e.g., `<CockpitColumn>`, `<CockpitHeaderZone>`).
- Document default placement (spotlight + roster on left, telemetry on top) in component comments.

### 2. Build virtualized task roster with contextual grouping
- Create `frontend/src/components/tasks/TaskRoster/` containing small, focused files: `TaskRoster.tsx`, `TaskRosterRow.tsx`, `TaskRosterFilters.tsx`.
- Use a virtualization library (`react-virtual` or equivalent) so hundreds of active tasks remain performant.
- Provide grouping tabs labeled **Operator Tasks** (started/selected by local user) and **Shared Tasks** (remote/system). Include search/filter hooks for future extension.
- Design rows with compact status badges (RX/TX/state), optional telemetry placeholders, and hover/click affordances for secondary metadata.
- Ensure Tailwind classes deliver consistent spacing, typography, and focus handling.

### 3. Implement dedicated active-task spotlight component
- Add `frontend/src/components/tasks/ActiveTaskPanel/ActiveTaskPanel.tsx` plus subcomponents for metrics, actions, and visualization linkage badges.
- Highlight the selected task with richer detail, quick actions (pause/stop/record), and a clear indicator when no task is selected.
- Leave slots/placeholders for FFT/waterfall linkage status and future mini telemetry graphs.
- Keep the component under ~200 lines by extracting subviews (e.g., `ActiveTaskActions.tsx`).

### 4. Wire active-task selection into shared application state
- Introduce `frontend/src/state/activeTaskStore.ts` (Zustand or existing state solution) to track the active task ID and metadata.
- Update task components to publish selection events to the store and subscribe via hooks.
- Update visualization modules (`frontend/src/components/visualizations/*`) and recording controls to consume the store, with fallbacks when no task is active.
- Add lightweight unit tests or storybook stories to document the interaction flow.

### 5. Standardize task UI components with Tailwind utilities
- Refactor existing task components (`TaskSidebar.tsx`, legacy `TaskCard.tsx`) to use Tailwind classes or migrate logic into the new roster/spotlight structure.
- Introduce shared primitives (e.g., `SegmentedControl`, `Badge`) under `frontend/src/components/primitives/` to remove inline style duplication.
- Ensure ARIA roles and keyboard navigation are implemented for filters and action buttons.
- Document styling conventions in component docstrings for future contributors.

### 6. Refresh task wizard with reusable form primitives and contextual guidance
- Rebuild `frontend/src/components/tasks/TaskWizard/` as a folder containing step components (e.g., `ModeStep.tsx`, `ConfigStep.tsx`, `ReviewStep.tsx`).
- Use shared `Button`, `Input`, and planned `Select` primitives to maintain consistent styling; remove direct DOM manipulation.
- Provide inline helper text linking wizard choices to how tasks appear in the roster/spotlight (e.g., “Selecting a task here sets it as Operator Task”).
- Handle validation and submission feedback within the component hierarchy while keeping files <200 lines each.

### 7. Create reusable status panel components for system telemetry
- Introduce `frontend/src/components/status/StatusPanel/` with primitives like `StatusPanel.tsx`, `StatusMetric.tsx`, and `StatusAlert.tsx` styled via Tailwind.
- Scaffold placeholder panels for Applications, Utilization, Detections, Tracks, and Health that can render mock data yet demonstrate layout compatibility.
- Ensure components support placement in left, top, or future right rails with responsive breakpoints.
- Provide README or inline documentation describing expected props and usage patterns.

### 8. Establish contribution guidelines for task-related components
- Add a short `README` within `frontend/src/components/tasks/` summarizing component boundaries, state flow, and styling standards.
- Include guidance on file size limits, testing expectations, and naming conventions to support multi-developer maintenance.

## Next Steps
Select the task you’d like to tackle first. Each task above retains the high-level objectives while providing enough context to implement incrementally without losing sight of the broader goals.
