# BIT Panel Filtering & Search

## Problem

The BIT (Built-In Test) panel becomes unwieldy when there are many tests. The tests view grows very long, making it difficult to:
- Quickly find failing tests
- Locate a specific test by name
- Focus on problems without scrolling through passing tests

## Solution

Add filtering and search capabilities to the BIT panel:
1. **Status filter toggles** - Show/hide tests by status (Fail/Warn/OK)
2. **Text search** - Filter tests by name with fuzzy/substring matching

## Design Decisions

### Filter Scope: Test-Centric, Global

The filter applies **globally to tests**, and all views derive from the filtered test set:

- **Tests view**: Shows tests matching the filter
- **Function tree**: Shows paths from root to tests matching the filter
- **Hardware tree**: Shows paths from root to tests matching the filter

This keeps the mental model simple - one filter, consistent across all views. When you toggle "Fail only", all three views show only data related to failing tests.

Tree nodes along the path retain their actual rollup status (not filtered). You're pruning branches that don't lead to matching tests, not filtering by node status.

### Why Not Node-Level Filtering?

We considered allowing search/filter on tree node names (e.g., "find the ADC node"), but this creates complex cross-view interactions:
- If you search for a node in Function view, then click a test under it, what happens to the filter when switching to Tests view?
- Node status rollup logic (fail → warn based on criticality) makes status filtering on nodes confusing

The simpler model: filters always answer "which tests?" and trees answer "where are those tests in the hierarchy?"

If node search becomes a pain point later, we could add a separate "find in tree" feature (Cmd+F style) that doesn't affect the main filter state.

### SummaryBanner Removal

The current `SummaryBanner` component shows Fail/Warn/OK counts. Since the status filter pills will display these same counts, the banner becomes redundant. Remove it to reduce visual clutter.

### Expand/Collapse Location

The expand/collapse controls (currently in a `⋮` menu next to the tabs) only apply to tree views - they're disabled when Tests view is active.

**Proposal:** Move expand/collapse controls into the tree views themselves, either:
- Inline buttons in a tree header row: `[Expand all] [Collapse all]`
- Compact icons next to search: `[🔍 Filter...] [⇲] [⇱]`

This removes a disabled control from Tests view and keeps tree-specific controls with the tree.

## Layout

### Chosen: Filters → Search → Tabs

```
┌─────────────────────────────────────────┐
│ [●Fail 3] [●Warn 5] [○OK 42]            │  ← Status filter toggles
│ [🔍 Filter tests...                  ]  │  ← Search input
│ [Tests] [Function] [Hardware]           │  ← View tabs
├─────────────────────────────────────────┤
│ (content: test list or tree)            │
└─────────────────────────────────────────┘
```

**Rationale:**
- Status filters at top = "I'm in triage mode, show me problems"
- Search below = "Now let me find the specific thing"
- Tabs last, adjacent to content = "This controls what's below"
- Filter bar becomes a persistent "lens" affecting everything
- Emphasizes that filters are global, tabs are just different views of filtered data

### Full Panel: Tests View

```
┌─────────────────────────────────────────┐
│ Built-In Test                           │
│ Last updated 3m ago          [Metrics ▾]│
├─────────────────────────────────────────┤
│ [Alerts section...]                     │
├─────────────────────────────────────────┤
│ [●Fail 3] [●Warn 5] [○OK 42]            │
│ [🔍 Filter tests...                  ]  │
│ [Tests ✓] [Function] [Hardware]         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ● RF Output Power Check      [FAIL] │ │
│ │ ● IF Linearity Test          [FAIL] │ │
│ │ ● Mixer Conversion Loss      [FAIL] │ │
│ │ ● LO Lock Detect             [WARN] │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Full Panel: Hardware Tree View

```
┌─────────────────────────────────────────┐
│ Built-In Test                           │
│ Last updated 3m ago          [Metrics ▾]│
├─────────────────────────────────────────┤
│ [Alerts section...]                     │
├─────────────────────────────────────────┤
│ [●Fail 3] [●Warn 5] [○OK 42]            │
│ [🔍 Filter tests...                  ]  │
│ [Tests] [Function] [Hardware ✓]         │
├─────────────────────────────────────────┤
│ [Expand all]  [Collapse all]            │  ← tree-only controls
│ ┌─────────────────────────────────────┐ │
│ │ ▼ RF Frontend            [FAIL]     │ │
│ │   ├─ ▶ LNA               [OK]       │ │  ← collapsed (only OK)
│ │   └─ ▼ Mixer Stage       [FAIL]     │ │
│ │       └─ ● IF Output     [FAIL]     │ │  ← test leaf
│ │ ▼ Digital                [WARN]     │ │
│ │   └─ ● FPGA Status       [WARN]     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Notes

### Filter State

Add to `SystemHealthPanel`:
```typescript
const [statusFilter, setStatusFilter] = useState<Set<BitStatus>>(
  new Set(['fail', 'warn', 'ok', 'unknown'])
);
const [searchQuery, setSearchQuery] = useState('');
```

### Filtered Tests

```typescript
const filteredTests = useMemo(() => {
  return sortedTests.filter(test => {
    // Status filter
    if (!statusFilter.has(test.status)) return false;

    // Search filter (case-insensitive substring match)
    if (searchQuery && !test.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });
}, [sortedTests, statusFilter, searchQuery]);
```

### Filtered Trees

Create a utility to prune trees to only show paths leading to filtered tests:

```typescript
function pruneTreeToTests(
  tree: BitTreeNode,
  matchingTestIds: Set<string>
): BitTreeNode | null {
  // Recursively prune children
  // Keep node if it has matching tests or has children that do
  // Return null if entire subtree has no matching tests
}
```

### Components to Modify

1. **SystemHealthPanel.tsx**
   - Add filter state
   - Add `FilterBar` component (status pills + search input)
   - Pass filtered tests/trees to child views
   - Remove `⋮` menu (move expand/collapse to tree views)

2. **TestsView.tsx**
   - Receive filtered tests instead of all tests
   - Remove `SummaryBanner` (counts now in filter pills)

3. **RollupTreeView.tsx**
   - Receive pruned tree based on filter
   - Add inline expand/collapse controls
   - Remove `SummaryBanner`

4. **New: FilterBar.tsx**
   - Status toggle pills with counts
   - Search input with debounced onChange
   - Clear search button

### Status Pill Design

```
[● Fail 3]  [● Warn 5]  [● OK 42]
 ↑           ↑           ↑
 red dot     yellow dot  green dot
```

- Active: filled background, full opacity
- Inactive: outlined/ghost, dimmed
- Counts always show totals (unfiltered) so user knows what's hidden
- Clicking toggles that status on/off

### Search Input

- Placeholder: "Filter tests..."
- Debounce: 150-200ms
- Clear button (×) when query is non-empty
- No submit button - filters as you type

## Future Enhancements

### Tree Find (Cmd+F)

A local search feature for finding nodes by name within tree views, separate from the main test filter.

**Trigger:** Cmd/Ctrl+F when a tree view (Function or Hardware) is focused

**Behavior:**
- Floating search bar appears at top of tree scroll area
- Searches node names only (not test names)
- Highlights matching nodes and scrolls to them
- Does NOT affect the main filter state or prune the tree
- Navigation: `[↑][↓]` buttons or Enter/Shift+Enter to cycle through matches
- Shows match index: "2/5"
- Dismissed with Esc or clicking outside

**Visual:**
```
┌─────────────────────────────────────────┐
│ [●Fail 3] [●Warn 5] [○OK 42]            │
│ [🔍 Filter tests...                  ]  │
│ [Tests] [Function] [Hardware ✓]         │
├─────────────────────────────────────────┤
│ [Expand all]  [Collapse all]            │
│ ┌─────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Find: [adc       ] [↑][↓] 2/5   │ │ │  ← floating bar
│ │ └─────────────────────────────────┘ │ │
│ │ ▼ RF Frontend            [FAIL]     │ │
│ │   └─ ▼ Mixer Stage       [FAIL]     │ │
│ │       └─ ▶ ADC Interface [OK] ←     │ │  ← highlighted match
│ │ ▼ Digital                [WARN]     │ │
│ │   └─ ▼ ADC Module        [OK] ←     │ │  ← another match
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key distinction from main filter:**

| Feature         | Main Filter Bar       | Tree Cmd+F           |
|-----------------|-----------------------|----------------------|
| Scope           | Tests (global)        | Node names (local)   |
| Effect          | Prunes data           | Highlights + scrolls |
| Persists        | Yes                   | Dismissed on Esc     |
| Affects views   | All three views       | Current tree only    |

### Other Future Considerations

- **Keyboard shortcuts**: `f` to focus main search, `1/2/3` to toggle status filters
- **Persist filter state**: Remember last filter in localStorage
- **Virtualized list**: If performance becomes an issue with 100+ tests, add react-window
