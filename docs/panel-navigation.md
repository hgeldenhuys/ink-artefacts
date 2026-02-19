# Panel Navigation — How the Stack Works

ink-panels uses a **stack**, not a layout. Only ONE panel is visible at a time. You navigate deeper by `push()`-ing a new panel onto the stack, and go back with `pop()` or Escape. Think browser history, not dashboard grid.

## Quick Overview

```
PanelStack
  └─ initialPanel (visible)
       ├─ push(detailPanel)  → detail replaces list on screen
       │    └─ push(editPanel) → edit replaces detail on screen
       │         └─ pop()      → back to detail
       └─ Escape              → back to list (or exits if at root)
```

The breadcrumb trail at the bottom shows where you are: `List > Detail > Edit`

## The Pattern

### 1. Define your panel component

Every panel receives `PanelProps` — this gives it `push`, `pop`, `replace`, `width`, `height`, and `data`.

```tsx
import { useInput } from 'ink';
import type { PanelConfig, PanelProps } from 'ink-panels';

interface MyListData {
  items: Array<{ id: string; name: string }>;
}

function MyListPanel({ data, push, width, height }: PanelProps<MyListData>) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex(i => Math.min(data.items.length - 1, i + 1));

    // Push a new panel onto the stack when user presses Enter
    if (key.return) {
      const item = data.items[selectedIndex];
      push(makeDetailPanel(item));
    }
  });

  return (
    <Box flexDirection="column">
      {data.items.map((item, i) => (
        <Text key={item.id}>
          {i === selectedIndex ? '> ' : '  '}{item.name}
        </Text>
      ))}
    </Box>
  );
}
```

### 2. Define the child panel

The child panel also receives `PanelProps`. It can `push()` to go deeper or `pop()` to go back.

```tsx
interface DetailData {
  item: { id: string; name: string };
}

function MyDetailPanel({ data, push, pop, width, height }: PanelProps<DetailData>) {
  useInput((input, key) => {
    // Push even deeper
    if (key.return) {
      push(makeEditPanel(data.item));
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{data.item.name}</Text>
      <Text>Press Enter to edit, Escape to go back</Text>
    </Box>
  );
}
```

### 3. Use factory functions for PanelConfig

Factory functions create the `PanelConfig` objects that `push()` expects. This keeps data typing clean and panel creation reusable.

```tsx
function makeDetailPanel(item: { id: string; name: string }): PanelConfig {
  return {
    id: `detail-${item.id}`,
    title: item.name,
    component: MyDetailPanel as any,
    data: { item },
  };
}

function makeEditPanel(item: { id: string; name: string }): PanelConfig {
  return {
    id: `edit-${item.id}`,
    title: `Edit ${item.name}`,
    component: MyEditPanel as any,
    data: { item },
  };
}
```

### 4. Wire it up with PanelStack

```tsx
import React from 'react';
import { render } from 'ink';
import { PanelStack } from 'ink-panels';

const { unmount } = render(
  <PanelStack
    appName="my-app"
    initialPanel={{
      id: 'list',
      title: 'Items',
      component: MyListPanel as any,
      data: { items: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }] },
    }}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />
);
```

## PanelConfig Shape

```typescript
interface PanelConfig<TData = unknown> {
  id: string;                              // Unique identifier
  title: string;                           // Shown in breadcrumb
  component: React.ComponentType<PanelProps<TData>>;  // The panel component
  data?: TData;                            // Data passed to the component
  state?: Record<string, unknown>;         // Serializable state for Claude integration
}
```

## PanelProps — What Every Panel Receives

```typescript
interface PanelProps<TData = unknown> {
  data: TData;                             // Data from the PanelConfig
  push: (panel: PanelConfig) => void;      // Navigate forward (new panel)
  pop: () => boolean;                      // Navigate back (returns false if at root)
  replace: (panel: PanelConfig) => void;   // Swap current panel (no back-nav)
  updateState: (state: Record<string, unknown>) => void;  // Update Claude state file
  state?: Record<string, unknown>;         // Persisted state from previous nav
  width: number;                           // Terminal width in columns
  height: number;                          // Available height (minus breadcrumb)
}
```

## Built-in Navigation Keys

PanelStack handles these globally — your panels do NOT need to handle them:

| Key | Action |
|-----|--------|
| `Escape` | Pop current panel (exits app if at root) |
| `[` | Go back (preserves forward history) |
| `]` | Go forward |
| `q` | Quit (only at root level) |
| `Q` | Quit (from any depth) |

## What NOT to Do

```tsx
// WRONG — don't combine panels in a side-by-side layout
<Box flexDirection="row">
  <ListPanel />
  <DetailPanel />
</Box>

// WRONG — don't render multiple panels conditionally
{view === 'list' ? <ListPanel /> : <DetailPanel />}

// RIGHT — push the detail panel when user selects something
push(makeDetailPanel(selectedItem));
```

The PanelStack manages which panel is visible. You never render panels yourself — you just call `push()`, `pop()`, or `replace()`.

## Input Lock for Modal Editing

When a panel has an active text input or edit mode, PanelStack's global keys (Escape, q, etc.) can interfere. Use `useInputLock()`:

```tsx
import { useInputLock } from 'ink-panels';

function MyEditorPanel({ data, push, pop }: PanelProps<EditorData>) {
  const { lock, unlock } = useInputLock();
  const [editing, setEditing] = useState(false);

  useInput((input, key) => {
    if (editing) {
      if (key.return) {
        setEditing(false);
        unlock(); // Re-enable PanelStack global keys
      }
      // Handle edit input...
    } else {
      if (input === 'e') {
        setEditing(true);
        lock(); // Disable PanelStack global keys
      }
    }
  });
}
```

## Built-in Panel Components

ink-panels includes ready-made panels you can push onto the stack:

- **`ListPanel`** — Scrollable list with search, bookmarks, and selection
- **`TablePanel`** — Table with sortable columns and row selection
- **`DetailPanel`** — Key-value field display

These all accept `PanelProps` and work with `push()` to navigate deeper.

## Real-World Example

The hook editor (`examples/hook-editor/`) demonstrates a 4-level navigation stack:

```
HookDashboard (14 event types with hook counts)
  └─► EventHooksList (matcher groups for one event)
       └─► MatcherGroupDetail (handlers in one group)
            └─► HookHandlerEditor (inline field editing)
```

Each level is a separate component. Each uses `push(makeNextPanel(...))` to go deeper. The entire app is ~800 lines in a single file with factory functions tying the panels together.
