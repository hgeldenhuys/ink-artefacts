---
id: "INKPANELS-001"
title: "Shared Context Event Log & Panel State Persistence"
status: "archived"
priority: "high"
complexity: "moderate"
created: "2026-02-19T08:00:00Z"
updated: "2026-02-19T10:30:00Z"
author: "architect"
tags: ["canvas", "state", "event-log", "ux", "shared-context"]
acceptance_criteria:
  - id: "AC-1"
    description: "Given a ListPanel with items, when I select item 5 and push into a detail view, then pop back, the ListPanel restores to item 5 selected (not reset to 0)"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
  - id: "AC-2"
    description: "Given any panel interaction (navigate, select, bookmark), when the action occurs, then a JSONL event is appended to ~/.claude/canvas-events.jsonl with session_id, timestamp, canvas, panel, action, and target fields"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
  - id: "AC-3"
    description: "Given a ListPanel, when I press 'b' on an item, then the item is bookmarked (visually marked) and a bookmark event is logged"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
  - id: "AC-4"
    description: "Given an event log with entries, when Claude reads the log file, then Claude can answer questions like 'what was the last file I viewed' by grepping/reading the JSONL"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
  - id: "AC-5"
    description: "Given the ArtifactWorkspace canvas viewer, when switching tabs or navigating panels, then navigation events (tab_switch, push, pop) are logged with artifact/panel context"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
  - id: "AC-6"
    description: "Given a canvas session, when events are logged, then each event includes the Claude session_id so events can be filtered per session"
    status: "passing"
    evidence: "Implemented and TypeScript compiles clean"
tasks:
  - id: "T-1"
    title: "Create useCanvasEvents hook for JSONL event logging"
    agent: "backend-dev"
    status: "done"
    depends_on: []
    effort_estimate: "M"
    ac_coverage: ["AC-2", "AC-6"]
  - id: "T-2"
    title: "Add state restoration to ListPanel (selectedIndex, scrollOffset)"
    agent: "frontend-dev"
    status: "done"
    depends_on: []
    effort_estimate: "S"
    ac_coverage: ["AC-1"]
  - id: "T-3"
    title: "Add bookmark toggle to ListPanel with persistence"
    agent: "frontend-dev"
    status: "done"
    depends_on: ["T-1"]
    effort_estimate: "M"
    ac_coverage: ["AC-3"]
  - id: "T-4"
    title: "Wire event logging into ArtifactWorkspace (tab switch, push, pop)"
    agent: "frontend-dev"
    status: "done"
    depends_on: ["T-1"]
    effort_estimate: "S"
    ac_coverage: ["AC-5"]
  - id: "T-5"
    title: "Wire event logging into ListPanel (select, navigate)"
    agent: "frontend-dev"
    status: "done"
    depends_on: ["T-1"]
    effort_estimate: "S"
    ac_coverage: ["AC-2", "AC-4"]
  - id: "T-6"
    title: "End-to-end verification and manual testing"
    agent: "qa-engineer"
    status: "done"
    depends_on: ["T-2", "T-3", "T-4", "T-5"]
    effort_estimate: "M"
    ac_coverage: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6"]
execution:
  started_at: null
  completed_at: null
  task_list_id: null
  session_ids: []
why:
  problem: "Panel state (scroll position, selected item) is lost on navigation. No shared context between user canvas interactions and Claude. Claude cannot answer questions like 'what did I last look at?' because user interactions are invisible."
  root_cause: "Panels are stateless — usePanelNavigation recreates panels fresh on each push/pop. No event logging of user interactions."
  impact: "Poor UX (losing scroll/selection position), missed opportunity for Claude to understand user intent from canvas browsing patterns."
---

# Shared Context Event Log & Panel State Persistence

## Problem Statement

1. **Lost panel state**: When navigating into a diff detail and back, the file list resets to the top. Selection/scroll state is not preserved across push/pop.

2. **No shared context**: Claude has no visibility into what the user is viewing, selecting, or bookmarking on the canvas. User interactions are invisible to Claude.

3. **No event log**: There's no audit trail of canvas interactions that could be queried for context like "the second last item I viewed" or "what files did I browse yesterday?"

## Technical Approach

### T-1: useCanvasEvents Hook

Create `src/hooks/useCanvasEvents.ts`:

```typescript
interface CanvasEvent {
  ts: string;           // ISO timestamp
  sid: string;          // Claude session ID
  canvas: string;       // e.g. "artifact-viewer"
  panel: string;        // e.g. "files"
  action: string;       // navigate | select | push | pop | tab_switch | bookmark | scroll
  target: Record<string, unknown>;  // action-specific payload
  meta?: Record<string, unknown>;
}
```

- Append-only writes to `~/.claude/canvas-events.jsonl`
- Session ID from `~/.claude/dashboard-meta.json` (already written by hooks) or `CLAUDE_SESSION_ID` env var
- Debounce scroll events (log at most once per 500ms for scroll position changes)
- Export `useCanvasEvents(canvasName: string)` returning `{ log(action, panel, target, meta?) }`

### T-2: ListPanel State Restoration

In `src/components/ListPanel.tsx`:
- Accept `initialSelectedIndex` from `props.data` or panel `state`
- Change `useState(0)` to `useState(state?.selectedIndex ?? 0)`
- The panel's `updateState({ selectedIndex, scrollOffset })` already fires on selection change
- When `usePanelNavigation.goBack()` restores the previous panel, its `state` field still contains the saved selectedIndex
- Need to thread `state` from PanelConfig through to PanelProps

### T-3: Bookmark Support

In `src/components/ListPanel.tsx`:
- Add `b` key handler to toggle bookmark on selected item
- Bookmarks stored in `~/.claude/canvas-bookmarks.json`: `{ [canvasName]: { [panelId]: { [itemId]: true } } }`
- Show bookmark indicator (star) next to bookmarked items
- Log bookmark event via useCanvasEvents

### T-4: ArtifactWorkspace Event Wiring

In `examples/artifact-viewer/ArtifactWorkspace.tsx`:
- Call `useCanvasEvents('artifact-viewer')`
- Log `tab_switch` on `[`/`]` key with `{ from, to, artifactTitle }`
- Log `push`/`pop` in ArtifactPanel when navigation occurs

### T-5: ListPanel Event Wiring

In `src/components/ListPanel.tsx`:
- Log `select` on Enter key with `{ index, label, id }`
- Log `navigate` on j/k/g/G with debounce

## Task Dependency Graph

```
T-1 (useCanvasEvents) ──┬── T-3 (bookmarks)
                         ├── T-4 (workspace events)
T-2 (state restore) ────┤── T-5 (list events)
                         │
                         └── T-6 (E2E verification)
```

T-1 and T-2 can run in parallel (no dependency). T-3/T-4/T-5 depend on T-1. T-6 depends on all.

## AC Coverage Matrix

| AC | T-1 | T-2 | T-3 | T-4 | T-5 | T-6 |
|----|-----|-----|-----|-----|-----|-----|
| AC-1 | | X | | | | X |
| AC-2 | X | | | | X | X |
| AC-3 | | | X | | | X |
| AC-4 | | | | | X | X |
| AC-5 | | | | X | | X |
| AC-6 | X | | | | | X |

All ACs covered. No circular dependencies.

## Notes

- Story created: 2026-02-19
- Backlog path: `.swarm/backlog/INKPANELS-001.md`
- T-shirt effort total: 2S + 3M = ~1 day of work — reasonable for "moderate" complexity
- The `state` field on PanelConfig is already serializable — no new serialization needed
- JSONL chosen over SQLite for simplicity -- Claude can grep it directly

## Mini-Retrospective: frontend-dev (T-3)
- **What worked:** The existing codebase was well-structured with clear interfaces. The `logCanvasEvent` non-hook export made it straightforward to log from inside `useInput`. The `canvasName` and `panelId` fields were already added to `ListPanelData` (likely by a prior T-5 run), reducing the delta.
- **What to remember:** Bookmark persistence uses sync file I/O wrapped in try/catch -- acceptable for tiny JSON files but would need rethinking for large bookmark sets. The `bookmarksEnabled` guard means bookmarks are opt-in: callers must provide both `canvasName` and `panelId` in the data prop for the feature to activate. The `bmKey` function uses `:` as separator -- item IDs containing colons could cause collisions.
- **Suggestion:** Consider adding a `useBookmarks(canvasName, panelId)` hook to extract bookmark logic out of ListPanel for reuse by other panel types (e.g., TablePanel).
- **Knowledge hints:** E: flat-key bookmark storage pattern with sync persistence | Q: colon separator in bookmark keys could collide with item IDs containing colons | P: guard feature behind optional props so existing callers are unaffected
