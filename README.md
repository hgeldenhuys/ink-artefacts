# ink-panels

Stack-based terminal UI framework for Claude Code. Two modes: **explore** data with interactive drill-down panels, or **canvas** runtime artifacts onto a live viewer.

Built on [Ink](https://github.com/vadimdemedes/ink) (React for terminals) with React 19, vim-style navigation, and automatic Claude Code state integration.

```
┌──────────────────────────────────────────────────────────┐
│  Epics                                                   │
│  ─────────────────────────────────────────────────────── │
│  > [P0] Authentication System                            │
│    [P1] Dashboard Redesign                               │
│    [P1] API Rate Limiting                                │
│    [P2] Dark Mode                                        │
│                                                          │
│  1/4                              j/k:move  Enter:select │
├──────────────────────────────────────────────────────────┤
│  Home › Epics                                    q:quit  │
└──────────────────────────────────────────────────────────┘
```

## Features

- **One panel at a time** — full terminal space, no split screens
- **Stack navigation** — push/pop/replace with breadcrumb trail
- **Forward/back history** — `[` and `]` like a browser, `Escape` clears forward
- **Built-in panels** — ListPanel, TablePanel, DetailPanel (with search, badges, hotkeys)
- **Custom panels** — any React component that accepts `PanelProps`
- **Input lock** — modal editing without Escape conflicts (`useInputLock`)
- **Claude state file** — writes `~/.claude/tui-state.json` on every interaction
- **Canvas mode** — drop JSON files to `~/.claude/artifacts/` for live artifact tabs
- **TMUX-aware** — respects pane dimensions, keyboard-friendly

## Installation

### As a Claude Code Plugin (Recommended)

```bash
/plugin marketplace add hgeldenhuys/ink-panels
/plugin install ink-panels@ink-panels
```

This gives Claude access to both skills:
- **`building-tui-panels`** — triggered by "explore my X", "build a TUI", "terminal dashboard"
- **`injecting-tui-artifacts`** — triggered by "canvas X", "show me", "visualize this"

### Manual Setup

```bash
git clone https://github.com/hgeldenhuys/ink-panels.git
cd ink-panels
bun install
```

Copy skills to your Claude config:

```bash
cp -r skills/building-tui-panels ~/.claude/skills/
cp -r skills/injecting-tui-artifacts ~/.claude/skills/
```

## Quick Start

### Explore Mode

Run any of the example apps:

```bash
# Filesystem browser
node --import tsx examples/file-browser/index.tsx

# 5-level scrum board (Epics → Features → Stories → Tasks → Detail)
node --import tsx examples/scrum-board/index.tsx

# Database browser with FK resolution
node --import tsx examples/db-browser/index.tsx

# Schema-driven YAML config editor
node --import tsx examples/yaml-editor/index.tsx

# Edit any YAML file against a schema
node --import tsx examples/yaml-editor/index.tsx path/to/config.yaml path/to/schema.json
```

Or use the npm scripts:

```bash
bun run explore:files
bun run explore:scrum
bun run explore:db
bun run explore:yaml
```

### Canvas Mode

Launch the artifact viewer, then drop JSON files into `~/.claude/artifacts/`:

```bash
# Start the viewer
bun run canvas

# In another terminal, inject an artifact
echo '{"id":"demo","title":"Demo","type":"key-value","data":{"Status":"OK","Version":"1.0"}}' > ~/.claude/artifacts/demo.json
```

The viewer picks up new files instantly via `fs.watch()`. Use `[` and `]` to cycle tabs.

## Examples

### File Browser
Navigate your filesystem with directory listings, file details, and syntax-highlighted previews. Demonstrates `ListPanel` → `DetailPanel` navigation.

### Scrum Board
Five levels deep: Epics → Features → Stories → Tasks → Task Detail. Shows factory function patterns and rich state annotations for Claude.

### Database Browser
Mock database explorer with table schemas, data grids with `/` search, row detail views, and foreign key resolution. Demonstrates `TablePanel` with all column options.

### YAML Editor
Schema-driven config editor. Reads a YAML file and JSON schema, renders fields as an interactive form. Booleans toggle, enums cycle, strings/numbers edit inline. Demonstrates custom panels with `useInputLock` for modal input.

### Artifact Viewer (Canvas)
Watches `~/.claude/artifacts/` for JSON descriptor files. Supports json-tree, disk-usage, table, key-value, file-list, and log renderers. Each artifact gets its own tab with independent navigation.

## Architecture

```
ink-panels/
├── src/                          # Library source
│   ├── components/
│   │   ├── PanelStack.tsx        # Root component (manages stack, keys, state)
│   │   ├── Breadcrumb.tsx        # Bottom bar with forward/back trail
│   │   ├── TablePanel.tsx        # Data table with search
│   │   ├── DetailPanel.tsx       # Key-value view with actions
│   │   └── ListPanel.tsx         # Scrollable list with badges
│   ├── hooks/
│   │   ├── usePanelNavigation.ts # Stack + forward/back history
│   │   ├── useStateFile.ts       # Debounced Claude state writer
│   │   └── useInputLock.ts       # Modal input lock for PanelStack
│   ├── types.ts                  # All TypeScript interfaces
│   └── index.ts                  # Public exports
├── examples/
│   ├── file-browser/             # Filesystem explorer
│   ├── scrum-board/              # Multi-level project board
│   ├── db-browser/               # Database browser
│   ├── yaml-editor/              # Schema-driven YAML editor
│   └── artifact-viewer/          # Canvas mode viewer
├── skills/                       # Claude Code skills
│   ├── building-tui-panels/      # "explore" skill
│   └── injecting-tui-artifacts/  # "canvas" skill
└── .claude-plugin/               # Plugin marketplace metadata
    ├── plugin.json
    └── marketplace.json
```

## Key Concepts

### Panel Navigation

Every panel receives `push`, `pop`, and `replace` functions:

```tsx
// Push a new panel onto the stack
props.push({ id: 'detail', title: 'Item', component: DetailPanel, data: {...} });

// Go back one level
props.pop();

// Replace current panel (no new breadcrumb entry)
props.replace(updatedPanel);
```

Global navigation keys handled by PanelStack:

| Key | Action |
|-----|--------|
| `Escape` | Go back (clears forward history) |
| `[` | Go back (preserves forward history) |
| `]` | Go forward |
| `q` | Quit (at root only) |

### Claude State Integration

PanelStack automatically writes `~/.claude/tui-state.json` on every navigation and state update:

```json
{
  "app": "my-app",
  "timestamp": "2026-02-19T10:30:00Z",
  "breadcrumb": ["Home", "Users", "Alice"],
  "activePanel": {
    "id": "user-detail",
    "title": "Alice",
    "state": { "type": "user-detail", "userId": 42 }
  }
}
```

This lets Claude Code know exactly what you're looking at in the TUI.

### Input Lock

Custom panels with modal input (text editing, search) should use `useInputLock()` to prevent PanelStack from intercepting Escape and other keys:

```tsx
const inputLock = useInputLock();
// inputLock.lock()   — claim keyboard (PanelStack ignores all keys)
// inputLock.unlock() — release keyboard
```

## Runtime

- **Always run with Node.js**: `node --import tsx app.tsx`
- **Never run with Bun**: Ink's `useInput` has stdin issues under Bun
- **Use Bun for package management**: `bun install`, `bun add`
- **TMUX-friendly**: Launch in a split pane with `tmux split-window -h -p 60 "node --import tsx app.tsx"`

## License

MIT
