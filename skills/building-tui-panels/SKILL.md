---
name: building-tui-panels
description: Build interactive "explore" terminal UI applications using the ink-panels library. Use when the user says "explore my X", wants to create a new TUI app, build a terminal dashboard, browse data in the terminal, or scaffold a panel-based CLI tool. Covers project setup, panel types, navigation, Claude state integration, and TMUX deployment. Triggers on "explore my", "build a TUI", "create a terminal app", "make a CLI browser", "terminal dashboard".
---

# Building TUI Panel Apps

Create interactive, panel-based terminal applications using ink-panels — a stack-based navigation framework built on Ink (React for terminals).

## Before Starting

- Read `skills/building-tui-panels/LEARNINGS.md` relative to this plugin's root if it exists — apply documented patterns and avoid known gotchas.
- The library source, examples, and components are all in the same repository as this skill. Locate the plugin root and use relative paths from there.

## Quick Reference

| What | Where (relative to plugin root) |
|------|-------|
| Library source | `src/` |
| Core components | `src/components/PanelStack.tsx`, `Breadcrumb.tsx` |
| Built-in panels | `src/components/TablePanel.tsx`, `DetailPanel.tsx`, `ListPanel.tsx` |
| Hooks | `src/hooks/usePanelNavigation.ts`, `useStateFile.ts`, `useInputLock.ts` |
| State file | `~/.claude/tui-state.json` |
| Runtime | Node.js (NOT Bun — Ink has stdin issues under Bun) |
| Package manager | Bun (for install/scripts only) |
| **TMUX** | **Required** — Claude launches panels via `tmux split-window` |
| Examples | `examples/file-browser/`, `examples/scrum-board/`, `examples/db-browser/`, `examples/yaml-editor/` |

## Prerequisites

Every ink-panels app needs these dependencies:

```json
{
  "type": "module",
  "dependencies": {
    "ink": "^6.7.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.0.0",
    "@types/react": "^19.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

**tsconfig.json** must have:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**Run command** (always Node, never Bun):

```bash
node --import tsx my-app.tsx
```

## Architecture

```
┌──────────────────────────────────────────────┐
│              Active Panel (full space)        │  ← Only ONE panel visible at a time
│                                              │
│  Renders whatever component is on top of     │
│  the stack: table, detail, list, or custom   │
│                                              │
├──────────────────────────────────────────────┤
│ Home › Category › Item #42       [ESC] Back  │  ← Breadcrumb (auto-derived from stack)
└──────────────────────────────────────────────┘
```

**Key concepts:**

1. **PanelStack** — The root component. Manages a LIFO stack of panels. Only the top panel renders.
2. **PanelConfig** — A descriptor that says which component to render and what data to pass.
3. **push/pop/replace** — Navigation functions injected into every panel via props.
4. **Breadcrumb** — Auto-generated from the stack titles. Shows forward history dimmed when using `[`/`]` navigation.
5. **State file** — On every navigation/selection change, writes context to `~/.claude/tui-state.json`.

## Core API

### PanelConfig

Every panel is described by a config object:

```tsx
const myPanel: PanelConfig = {
  id: 'unique-id',           // Unique string
  title: 'Breadcrumb Title', // Shown in breadcrumb bar
  component: MyPanel,        // React component (receives PanelProps)
  data: { /* anything */ },  // Passed as props.data
  state: { /* serializable */ }, // Written to Claude state file
};
```

### PanelProps

Every panel component receives these props:

```tsx
interface PanelProps<TData> {
  data: TData;                                    // The data from PanelConfig
  push: (panel: PanelConfig) => void;             // Navigate forward
  pop: () => boolean;                             // Navigate back
  replace: (panel: PanelConfig) => void;          // Replace current panel
  updateState: (state: Record<string, unknown>) => void; // Update Claude state
  width: number;                                  // Available terminal columns
  height: number;                                 // Available terminal rows (minus breadcrumb)
}
```

### PanelStack (root component)

```tsx
import { render } from 'ink';

const { unmount } = render(
  <PanelStack
    appName="my-app"              // Written to state file
    initialPanel={rootPanel}      // First panel to show
    onExit={() => {               // Called when Escape at root
      unmount();
      process.exit(0);
    }}
    stateFilePath="~/.claude/tui-state.json"  // Optional, this is the default
    enableStateFile={true}                     // Optional, default true
  />,
);
```

### Navigation Keys

| Key | Action |
|-----|--------|
| `Escape` | Go back (clears forward history) |
| `[` | Go back (preserves forward history, like browser back) |
| `]` | Go forward (re-enter previous panel) |
| `q` | Quit (only at root panel) |

## Built-in Panel Types

### ListPanel

Scrollable list with badges. Best for menus, navigation, and selection.

```tsx
const panel: PanelConfig = {
  id: 'my-list',
  title: 'Items',
  component: ListPanel,
  data: {
    title: 'Choose an item',
    items: [
      { id: 'item-1', label: 'First Item', description: 'Optional', badge: 'NEW', badgeColor: 'green' },
    ],
    onSelect: (item, index, panelProps) => {
      panelProps.push(nextPanel);
    },
  },
};
```

**Keys:** j/k or arrows to move, Enter to select, g/G for top/bottom.

### TablePanel

Data table with column auto-sizing, vim navigation, and `/` search.

```tsx
const panel: PanelConfig = {
  id: 'my-table',
  title: 'Users',
  component: TablePanel,
  data: {
    title: 'User List',
    columns: [
      { header: 'ID', accessor: 'id', width: 6, align: 'right' },
      { header: 'Name', accessor: 'name' },
      { header: 'Role', accessor: 'role', width: 12 },
    ],
    rows: [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'dev' },
    ],
    searchable: true,
    onSelect: (row, index, panelProps) => {
      panelProps.push(makeDetailPanel(row));
    },
  },
};
```

**Keys:** j/k/arrows to move, Enter to select, `/` to search, g/G top/bottom, PgUp/PgDn.

### DetailPanel

Key-value detail view with action hotkeys.

```tsx
const panel: PanelConfig = {
  id: 'user-detail',
  title: 'Alice',
  component: DetailPanel,
  data: {
    title: 'User: Alice Johnson',
    fields: [
      { label: 'ID', value: 1 },
      { label: 'Email', value: 'alice@co.com' },
      { label: 'Role', value: 'admin', color: 'green' },
    ],
    actions: [
      { key: 'e', label: 'Edit', handler: (p) => p.push(editPanel) },
    ],
  },
};
```

## Writing Custom Panels

Any React component that accepts `PanelProps<TData>` can be a panel. See `examples/yaml-editor/EditorPanel.tsx` for a full example of a custom panel with inline text editing.

### Custom Panel Checklist

- [ ] Accept `PanelProps<TData>` as props
- [ ] Use `width` and `height` to fill space (don't hardcode dimensions)
- [ ] Call `updateState()` when selection/view changes (for Claude integration)
- [ ] Use `useInput` for keyboard handling (j/k, Enter, etc.)
- [ ] Use `push()` to navigate forward, never manage your own sub-screens
- [ ] Show a status/help bar at the bottom with available keys
- [ ] Use `flexGrow={1}` on a spacer `<Box>` between content and status bar

### Input Lock (for modal editing)

When your panel has a modal input mode (text editing, search, etc.), use `useInputLock` to prevent PanelStack from handling Escape/[/]/q:

```tsx
import { useInputLock } from '../../src/hooks/useInputLock.js';

function MyEditorPanel(props: PanelProps<MyData>) {
  const inputLock = useInputLock();
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (editMode) inputLock.lock();
    else inputLock.unlock();
    return () => { inputLock.unlock(); };
  }, [editMode]);

  useInput((input, key) => {
    if (editMode) {
      if (key.escape) { setEditMode(false); return; } // Won't also pop!
      return;
    }
    // normal mode keys...
  });
}
```

### Important Patterns

**Navigation via factory functions** — don't inline panel configs:

```tsx
function makeUserDetail(user: User): PanelConfig {
  return {
    id: `user-${user.id}`,
    title: user.name,
    component: DetailPanel,
    data: {
      title: user.name,
      fields: [
        { label: 'Email', value: user.email },
        { label: 'Role', value: user.role },
      ],
    },
    state: { type: 'user-detail', userId: user.id },
  };
}
```

**State for Claude** — always include `type` and relevant IDs:

```tsx
state: {
  type: 'task-detail',
  taskId: task.id,
  taskTitle: task.title,
  parentStoryId: story.id,
}
```

## Scaffold Workflow

When building a new ink-panels app from scratch:

- [ ] 1. **Check TMUX** — Run `which tmux` and confirm the user is inside a TMUX session (`echo $TMUX`). If not installed or not in a session, stop and tell the user: "ink-panels requires TMUX. Install with `brew install tmux` and start a session with `tmux`."
- [ ] 2. **Create project directory** and initialize with `bun init`
- [ ] 3. **Install dependencies**: `bun add ink react && bun add -d @types/node @types/react tsx typescript`
- [ ] 4. **Copy tsconfig.json** from Prerequisites section above
- [ ] 5. **Plan the panel hierarchy** — draw out the navigation tree
- [ ] 6. **Define data types** — TypeScript interfaces for your domain
- [ ] 7. **Write factory functions** — one `makeSomethingPanel()` per node in the tree
- [ ] 8. **Wire up the root panel** and `PanelStack`
- [ ] 9. **Add state annotations** — `state: { type: '...', id: ... }` on each panel
- [ ] 10. **Add a run script** to package.json: `"start": "node --import tsx index.tsx"`
- [ ] 11. **Launch in TMUX**: `tmux split-window -h -p 60 "node --import tsx index.tsx"`
- [ ] 12. **Verify state file**: `cat ~/.claude/tui-state.json` while navigating

## Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| `tmux split-window` fails | Not inside a TMUX session | Start one with `tmux` first |
| App exits immediately | Running with Bun instead of Node | Use `node --import tsx` not `bun` |
| Escape exits instead of going back | React 19 setState timing bug | Library already fixed — uses `useRef` to mirror stack synchronously |
| Rendering glitches in TMUX | Wrong TERM variable | Set `TERM=tmux-256color` in tmux.conf |
| Input lag in TMUX | Escape-time delay | Add `set -sg escape-time 10` to tmux.conf |
| Escape pops panel during text edit | PanelStack handles Escape globally | Use `useInputLock()` to claim keys during modal editing |
| `q` key exits unexpectedly | `q` quits at root level by design | Only use `q` in search mode or custom panels that consume it |
| Columns too wide/narrow | Auto-sizing samples first 50 rows | Set explicit `width` or `minWidth`/`maxWidth` on columns |
| State file not updating | `enableStateFile` is false, or path unwritable | Check path permissions, ensure `~/.claude/` exists |

## After Use

When this skill's task is complete:

1. **Capture learnings** — If you learned something new, append it to `skills/building-tui-panels/LEARNINGS.md` in the plugin directory. Create the file if it doesn't exist.
2. **Suggest improvements** — Note suggestions in your response so the user can decide whether to update the skill.
