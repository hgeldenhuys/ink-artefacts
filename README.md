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
- **Requires TMUX** — Claude Code launches panels in a split pane; TMUX is how it gets a second terminal

## Prerequisites

- **TMUX** — Required. Claude Code runs in one pane and launches the TUI in an adjacent pane via `tmux split-window`. Without TMUX there's no way for Claude to programmatically open a side-by-side terminal. Install with `brew install tmux` (macOS) or `apt install tmux` (Linux).
- **Node.js** — Required for running apps (Ink has stdin issues under Bun).
- **Bun** — Recommended for package management (`bun install`, `bun add`).

Recommended TMUX settings (in `~/.tmux.conf`):

```
set -sg escape-time 10          # prevent input lag
set -g default-terminal "tmux-256color"  # proper color support
```

## Installation

### As a Claude Code Plugin (Recommended)

```bash
/plugin marketplace add hgeldenhuys/ink-artefacts
/plugin install ink-panels@ink-artefacts
```

This gives Claude access to both skills:
- **`building-tui-panels`** — triggered by "explore my X", "build a TUI", "terminal dashboard"
- **`injecting-tui-artifacts`** — triggered by "canvas X", "show me", "visualize this"

### Manual Setup

```bash
git clone https://github.com/hgeldenhuys/ink-artefacts.git
cd ink-artefacts
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

# SWARM project explorer (recursive-ai integration)
node --import tsx examples/swarm-explorer/index.tsx [path-to-.swarm-dir]

# Real-time system monitor
node --import tsx examples/system-monitor/index.tsx

# Doc reader (markdown rendering + syntax highlighting)
node --import tsx examples/doc-reader/index.tsx [directory]

# Git repository dashboard
node --import tsx examples/git-dashboard/index.tsx [repo-path]

# Project overview dashboard
node --import tsx examples/project-dashboard/index.tsx [project-path]
```

Or use the npm scripts:

```bash
bun run explore:files
bun run explore:scrum
bun run explore:db
bun run explore:yaml
bun run explore:clock
bun run explore:swarm
bun run explore:sysmon
bun run explore:docs
bun run explore:git
bun run explore:project
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

### Clock & Timer
Big ASCII-art digital clock with a built-in countdown timer. Press `t` to set a timer with hours/minutes/seconds, `Space` to start/pause. When the timer reaches zero the screen flashes red three times. Demonstrates real-time `setInterval` rendering and `useInputLock` for modal field editing.

### SWARM Explorer
Interactive browser for [recursive-ai](https://github.com/hgeldenhuys/recursive-ai) SWARM projects. Dashboard with story status bars, task/AC metrics, and knowledge dimension counts. Drill into stories to see acceptance criteria (with evidence), tasks (with agent assignments and dependency chains), knowledge items (filtered by E/Q/P dimension), and retrospectives with full metrics. Pass a `.swarm/` directory path as argument, or use the bundled sample data.

### System Monitor
Real-time system dashboard showing CPU usage with sparkline history, memory with progress bars, disk usage, and top processes sorted by CPU. Auto-refreshes every 1.5 seconds. Uses Unicode block characters for bars and braille-style sparklines. Color-coded thresholds: green (<40%), cyan (<70%), yellow (<90%), red (>90%).

### Doc Reader
Browse and read documentation with rich rendering. Markdown files are rendered with full terminal styling (headers, bold, code blocks, lists) via `marked` + `marked-terminal`. Source code files get syntax highlighting via `ink-syntax-highlight` with language auto-detection. Supports scrolling with vim keys, line number toggle, and filtered file lists (only docs and source files shown). Pass a directory path as argument.

### Git Dashboard
Interactive repository overview with a giant gradient repo name header (`ink-big-text` + `ink-gradient`), loading spinner (`ink-spinner`), and tabbed sections for commits, branches, changes, and stats. Drill into commit details with `git show --stat`, browse branches with ahead/behind indicators, view staged/unstaged changes, and see contributor bar charts. All data from real `git` commands. Pass a repo path as argument.

### Project Dashboard
Beautiful Node.js project overview combining multiple Ink ecosystem libraries. Giant gradient project name, health checks (README, tests, CI, TypeScript, linter, CLAUDE.md), file type distribution with Unicode bar charts, dependency browser, script viewer with syntax-highlighted commands, directory size breakdown, and TODO/FIXME counter. Scans the actual project directory recursively. Pass a project path as argument.

### Artifact Viewer (Canvas)
Watches `~/.claude/artifacts/` for JSON descriptor files. Supports json-tree, disk-usage, table, key-value, file-list, diff-list, and log renderers. Each artifact gets its own tab with independent navigation.

### Live Dashboard (Hooks)
A Claude Code hooks integration that provides a real-time dashboard while Claude works. Uses `PostToolUse` and `Stop` hooks to write session-scoped artifacts that the canvas viewer picks up automatically.

**Panels:**
- **Tasks** — Live task progress extracted from the transcript. Shows in-progress, pending, and completed tasks with strikethrough styling.
- **Files** — Recently edited files with drill-down diff view. Select a file and press Enter to see each edit's removed (red) and added (green) lines.

Install and launch:

```bash
# Install hooks into your project
bun run dashboard:install

# Launch the dashboard in a TMUX pane
tmux split-window -h -p 50 -c /path/to/ink-panels "NODE_ENV=production node --import tsx examples/artifact-viewer/index.tsx"
```

Or configure hooks manually in your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [{ "type": "command", "command": "bun \"$CLAUDE_PROJECT_DIR\"/ink-panels/hooks/dashboard-hook.ts" }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "bun \"$CLAUDE_PROJECT_DIR\"/ink-panels/hooks/dashboard-hook.ts" }]
      }
    ]
  }
}
```

**How it works:**
- `PostToolUse` fires after every tool call (Read, Write, Edit, Bash, etc.), updating files and re-parsing the transcript for task state.
- `Stop` fires when Claude finishes responding, catching TaskCreate/TaskUpdate which don't trigger PostToolUse.
- Artifacts are session-scoped (`session-{id}-01-tasks.json`) so they don't interfere with other artifacts.
- The canvas viewer detects file changes via `fs.watch()` and live-updates the panels.

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
│   ├── clock/                    # Digital clock & countdown timer
│   ├── swarm-explorer/           # recursive-ai SWARM project browser
│   ├── system-monitor/           # Real-time CPU/mem/disk/process dashboard
│   ├── doc-reader/               # Markdown + syntax-highlighted code viewer
│   ├── git-dashboard/            # Git repo overview with gradient header
│   ├── project-dashboard/        # Node.js project health & stats
│   └── artifact-viewer/          # Canvas mode viewer
│       └── renderers/
│           ├── json-tree.tsx      # JSON tree viewer
│           ├── disk-usage.tsx     # Disk usage bars
│           ├── table-view.tsx     # Table renderer
│           ├── log-view.tsx       # Scrollable log
│           └── diff-view.tsx      # Inline diff viewer (red/green)
├── hooks/                        # Claude Code hooks
│   ├── dashboard-hook.ts         # PostToolUse/Stop hook for live dashboard
│   └── install-hooks.ts          # Installs hooks into project settings
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
- **TMUX is required**: Claude Code launches panels via `tmux split-window -h -p 60 "node --import tsx app.tsx"` — without TMUX, you'd need to manually open a second terminal

## License

MIT
