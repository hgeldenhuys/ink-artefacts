---
story_id: "INKPANELS-001"
title: "Shared Context Event Log & Panel State Persistence"
completed: "2026-02-19T10:30:00Z"
duration: "~2 hours"
agents_involved: ["architect", "backend-dev", "frontend-dev", "qa-engineer"]
repo: "ink-panels"
team: ""
knowledge_extracted: ["K-001-01", "K-001-02", "K-001-03", "K-001-04", "K-001-05"]
metrics:
  tasks_total: 6
  tasks_completed: 6
  acs_total: 6
  acs_passing: 6
  files_changed: 10
  tests_added: 0
  cycle_time_hours: 2
---

# Retrospective: Shared Context Event Log & Panel State Persistence

## Summary

Implemented a shared context system between the canvas viewer TUI and Claude Code. Three capabilities were added: (1) panel state persistence so ListPanel restores selectedIndex/scrollOffset on navigation pop, (2) a JSONL event log at `~/.claude/canvas-events.jsonl` that records user interactions (select, push, pop, tab_switch, bookmark, scroll) with session IDs, and (3) a bookmark system for ListPanel items persisted to `~/.claude/canvas-bookmarks.json`. All 6 acceptance criteria pass and TypeScript compiles clean.

## What Went Well

- **Parallel task execution**: T-1 (useCanvasEvents) and T-2 (state restoration) ran in parallel with no conflicts. T-3, T-4, T-5 also ran in parallel after T-1 completed.
- **Clean interfaces**: The existing PanelConfig/PanelProps types had a natural place for `state` — just needed threading through PanelStack.
- **Non-hook export pattern**: Exporting `logCanvasEvent` as a plain function alongside the `useCanvasEvents` hook allowed event logging from both React components and plain callbacks (like `useInput` handlers).
- **Minimal blast radius**: State restoration required only adding `state` to PanelProps and changing `useState(0)` to `useState(props.state?.selectedIndex ?? 0)` in ListPanel — a very targeted change.
- **SWARM pipeline**: The full ideate-plan-execute-verify-close pipeline ran smoothly for a moderate-complexity story.

## What Could Improve

- **No runtime tests**: All verification was via TypeScript compilation. No unit or integration tests were added for the new hooks or bookmark persistence. The `test-first` WoW was not followed.
- **Bookmark key collision risk**: The `canvasName:panelId:itemId` flat key format could collide if item IDs contain colons. A separator like `\x00` or structured JSON keys would be safer.
- **Scroll event logging not wired**: The debounced scroll logging exists in `useCanvasEvents` but no panel actually calls `log('scroll', ...)` yet — the scroll position changes are logged as part of state updates, not as explicit scroll events.
- **Sync file I/O in hot paths**: Bookmark reads/writes and event appends use `readFileSync`/`writeFileSync`/`appendFileSync`. Fine for small files but could cause UI jank with large bookmark sets or high event volumes.

## Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| JSONL over SQLite for event log | Claude can grep JSONL directly; no binary dependencies | SQLite (better querying but requires driver), JSON array (can't append atomically) |
| Flat bookmark keys (`canvas:panel:item`) | Simple, fast lookup, no nesting | Nested JSON object `{canvas: {panel: {item: true}}}` — harder to merge |
| Session ID from dashboard-meta.json | Already written by existing hooks; cached on first read | Env var `CLAUDE_SESSION_ID` (not always set), generate new UUID (loses session correlation) |
| Non-hook `logCanvasEvent` export | Needed for `useInput` callbacks which can't use hooks | Passing log function via props (too much threading), global event emitter (over-engineered) |
| Bookmarks opt-in via `canvasName` + `panelId` props | Existing callers unaffected; no breaking changes | Always-on bookmarks (would need IDs for all panels) |

## Effort Analysis

| Task | Agent | Estimated | Actual | Notes |
|------|-------|-----------|--------|-------|
| T-1: useCanvasEvents hook | backend-dev | M | M | On target — clean implementation with debounce and caching |
| T-2: ListPanel state restoration | frontend-dev | S | S | On target — minimal change, just threading state |
| T-3: Bookmark toggle | frontend-dev | M | M | On target — file I/O + UI + event logging |
| T-4: ArtifactWorkspace events | frontend-dev | S | S | On target — wrapping push/pop, logging tab_switch |
| T-5: ListPanel events | frontend-dev | S | S | On target — logging select on Enter key |
| T-6: E2E verification | qa-engineer | M | S | Faster than expected — all TypeScript compilation checks passed first try |

## Learnings by Agent

### backend-dev
- The non-hook `logCanvasEvent` function pattern works well for cross-cutting concerns that need to fire from both React components and plain callbacks.
- Caching the session ID on first read avoids repeated file I/O on every event.

### frontend-dev
- Threading `state` through PanelConfig -> PanelStack -> PanelProps is the right pattern for panel state restoration. The navigation stack already preserves PanelConfig, so state comes for free.
- Bookmark persistence with sync I/O is acceptable for tiny JSON files but would need async refactoring for large datasets.
- The `useInput` callback is the right place for event logging since it already handles all user key actions.

### qa-engineer
- TypeScript compilation as verification is fast but doesn't catch runtime issues like file permission errors or JSONL corruption.
- The `canvasName` and `panelId` fields need to be wired into all artifact types that use ListPanel (diff-list, file-list) — this was missed initially and caught during verification.

### architect
- The separation of data collection (hooks writing state files) from display (inject scripts writing artifacts) is a pattern worth preserving. It gives users control over what appears on their canvas.
- JSONL is the right choice for append-only logs that Claude needs to query — it's greppable, streamable, and doesn't require parsing an entire file.

## Knowledge to Preserve

| # | Dimension | Scope | Title | Description |
|---|-----------|-------|-------|-------------|
| 1 | E | repo | Non-hook event logging export | Export `logCanvasEvent` as a plain function alongside the React hook for use in callbacks and non-component code |
| 2 | Q | repo | Colon separator collision in bookmark keys | Flat key format `canvas:panel:item` collides if item IDs contain colons — use a safer separator |
| 3 | P | repo | Panel state restoration via PanelConfig.state | Thread state through PanelConfig -> PanelStack -> PanelProps; navigation stack preserves it automatically |
| 4 | P | repo | Opt-in features via optional props | Guard features (bookmarks) behind optional props so existing callers are unaffected |
| 5 | E | repo | JSONL for Claude-queryable event logs | Append-only JSONL files are greppable by Claude and don't require parsing entire files |
