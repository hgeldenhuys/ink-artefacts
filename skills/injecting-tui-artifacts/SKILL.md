---
name: injecting-tui-artifacts
description: Inject interactive TUI artifacts onto the canvas viewer. Use when the user says "canvas X", "show me", "display", "visualize", or "browse" data in the terminal — JSON files, disk usage, tables, key-value pairs, or file lists. Creates artifact JSON descriptors that the running canvas picks up in real-time. Triggers on "canvas", "show me an artifact", "visualize this", "display as a table", "browse the JSON".
---

# Injecting TUI Artifacts

Create runtime artifacts for the ink-panels canvas. Artifacts appear instantly in any running viewer.

## Before Starting

- Read `skills/injecting-tui-artifacts/LEARNINGS.md` relative to this plugin's root if it exists.
- The canvas viewer source is in the same repository as this skill, at `examples/artifact-viewer/`.

## Quick Reference

| Artifact Type | Use When | Data Shape |
|---------------|----------|------------|
| `json-tree` | Browsing JSON/object data with expand/collapse | `{ json: <any>, title?: string }` |
| `disk-usage` | Visualizing size distributions with bar charts | `{ title?: string, entries: [{name, size, children?}] }` |
| `table` | Tabular data with search and row drill-down | `{ title?, columns: [{header, accessor, width?, align?}], rows: [{}] }` |
| `key-value` | Flat key-value detail views | `Record<string, unknown>` (keys become labels) |
| `file-list` | Browsable lists with badges and descriptions | `[{name, description?, badge?, badgeColor?}]` |
| `log` | Text/log output, optionally colored | `string` or `{ content: string, color?: string, title?: string }` |

## Core Instructions

### How It Works

The canvas watches `~/.claude/artifacts/` for JSON files. Any process can drop a file there and it appears as a new tab in the viewer instantly.

### Writing an Artifact

Write a JSON file to `~/.claude/artifacts/<unique-name>.json` with this schema:

```json
{
  "id": "unique-id",
  "title": "Tab Title",
  "type": "json-tree",
  "data": { ... },
  "createdAt": "2026-02-18T12:00:00Z"
}
```

**Rules:**
- `id` must be unique across all artifacts. Use descriptive slugs: `pkg-json`, `disk-src`, `users-table`.
- `title` is shown in the tab bar — keep it short (under 20 chars).
- `type` determines the renderer (see Quick Reference).
- `data` shape depends on `type` (see Artifact Types below).
- Filename must end in `.json`. Use a prefix for ordering: `01-first.json`, `02-second.json`.

### Launching the Canvas

If the viewer is not already running, find the plugin root (same repo as this skill) and launch:

```bash
tmux split-window -h -p 60 "node --import tsx <plugin-root>/examples/artifact-viewer/index.tsx"
```

### Canvas Controls

| Key | Action |
|-----|--------|
| `[` / `]` | Cycle between artifact tabs |
| `j` / `k` | Navigate within an artifact |
| `Enter` | Drill into detail / expand |
| `Escape` | Go back within artifact stack |
| `Ctrl+Q` | Quit viewer |

## Artifact Types

### json-tree

Interactive collapsible JSON tree viewer.

```json
{
  "id": "config-json",
  "title": "Config",
  "type": "json-tree",
  "data": {
    "json": { "database": { "host": "localhost", "port": 5432 }, "features": ["auth", "api"] },
    "title": "App Configuration"
  }
}
```

### disk-usage

Bar chart sorted by size. Supports drill-down via `children`.

```json
{
  "id": "src-usage",
  "title": "Disk: src/",
  "type": "disk-usage",
  "data": {
    "title": "Source Directory",
    "entries": [
      { "name": "components/", "size": 245000, "children": [
        { "name": "Button.tsx", "size": 12000 },
        { "name": "Table.tsx", "size": 48000 }
      ]},
      { "name": "utils/", "size": 89000 }
    ]
  }
}
```

### table

Data table with search (`/`) and row drill-down.

```json
{
  "id": "users-list",
  "title": "Users",
  "type": "table",
  "data": {
    "title": "Active Users",
    "columns": [
      { "header": "ID", "accessor": "id", "width": 6, "align": "right" },
      { "header": "Name", "accessor": "name" },
      { "header": "Role", "accessor": "role", "width": 12 }
    ],
    "rows": [
      { "id": 1, "name": "Alice", "role": "admin" },
      { "id": 2, "name": "Bob", "role": "dev" }
    ]
  }
}
```

### key-value

Flat key-value pairs as a detail panel.

```json
{
  "id": "env-info",
  "title": "Environment",
  "type": "key-value",
  "data": { "Node": "v22.0.0", "Platform": "darwin arm64", "Memory": "16 GB" }
}
```

### file-list

Scrollable list with badges.

```json
{
  "id": "modified-files",
  "title": "Changed Files",
  "type": "file-list",
  "data": [
    { "name": "src/index.ts", "description": "+42 -10", "badge": "M", "badgeColor": "yellow" },
    { "name": "src/new-file.ts", "description": "new", "badge": "A", "badgeColor": "green" }
  ]
}
```

### log

Text output with optional color.

```json
{
  "id": "art-piece",
  "title": "My Art",
  "type": "log",
  "data": { "content": "Hello world!", "color": "red", "title": "Colored Log" }
}
```

## Workflow

There are two distinct operations. **Never combine them in one step.**

### A) First-time launch (viewer is NOT running)

- [ ] 1. **Gather data** — Read files, run commands, query APIs to get the raw data.
- [ ] 2. **Choose artifact type** — Match data shape to the best renderer.
- [ ] 3. **Write artifact file(s)** — Use the Write tool to create `~/.claude/artifacts/<name>.json`.
- [ ] 4. **Launch the viewer** — Open it in a TMUX pane (see Launching the Canvas).
- [ ] 5. **Confirm** — Tell the user which tab to look at and what keys to use.

### B) Adding artifacts (viewer IS already running)

- [ ] 1. **Gather data** — Read files, run commands, query APIs.
- [ ] 2. **Choose artifact type** — Match data shape to the best renderer.
- [ ] 3. **Write the artifact file** — Use the Write tool to create `~/.claude/artifacts/<name>.json`.
- [ ] 4. **Done.** The viewer picks it up via `fs.watch()` automatically. No TMUX commands needed.
- [ ] 5. **Confirm** — Tell the user a new tab appeared and to press `]` to get to it.

**CRITICAL: When the viewer is already running, ONLY write the JSON file. Do NOT launch a new TMUX pane.**

### How to detect if the viewer is running

```bash
pgrep -f "artifact-viewer/index.tsx"
```

If this returns a PID, the viewer is running — use workflow B.
If no output, the viewer is not running — use workflow A.

## Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| New TMUX pane flashes when adding artifact | Launched viewer when it was already running | Check with `pgrep` first |
| Artifact doesn't appear | Viewer started before file was written | Write files first, then launch viewer |
| Tab shows old data | Wrote to same filename as existing artifact | Use unique filenames |
| Viewer shows "No artifacts yet" | Files not in `~/.claude/artifacts/` or don't end in `.json` | Check path and extension |

## After Use

When this skill's task is complete:

1. **Capture learnings** — Append to `skills/injecting-tui-artifacts/LEARNINGS.md` in the plugin directory.
2. **Suggest improvements** — Note suggestions in your response.
