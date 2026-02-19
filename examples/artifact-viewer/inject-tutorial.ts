/**
 * Injects the "Building a Panel" tutorial as canvas artifacts.
 *
 * Usage:
 *   node --import tsx examples/artifact-viewer/inject-tutorial.ts
 *
 * Then open the canvas viewer to see the tutorial tabs:
 *   bun run canvas
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const ARTIFACTS_DIR = join(homedir(), '.claude', 'artifacts');
mkdirSync(ARTIFACTS_DIR, { recursive: true });

function write(filename: string, artifact: object) {
  writeFileSync(join(ARTIFACTS_DIR, filename), JSON.stringify(artifact, null, 2));
  console.log(`  Wrote ${filename}`);
}

// ─── Tutorial pages ──────────────────────────────────────

const pages = [
  {
    id: 'tutorial-01',
    title: '1. Welcome',
    filename: 'tutorial-01-welcome.json',
    content: `# Building Your First ink-panels Panel

Welcome to the ink-panels tutorial! This guide walks you through
building an interactive terminal UI panel from scratch.

## What is ink-panels?

ink-panels is a stack-based navigation framework for terminal UIs,
built on Ink (React for terminals). Think of it like a browser:

- **Push** a panel onto the stack to navigate forward
- **Pop** to go back (Escape or [)
- **Replace** to swap the current panel
- **Breadcrumbs** show your navigation trail at the bottom

## What you'll build

By the end of this tutorial, you'll build a **Pokemon Explorer**:
a panel that lists Pokemon, lets you select one, and drills into
a detail view. It uses:

- **ListPanel** for the browsable list
- **DetailPanel** for the detail view
- **Custom panel** for a stats display
- **PanelStack** to tie it all together

## Prerequisites

- Node.js (not Bun -- Ink has stdin issues under Bun)
- TMUX (for running alongside Claude Code)
- Basic React knowledge

**Scroll down with j/k or PgDn to continue, or use ] to go to the next tab.**`,
  },
  {
    id: 'tutorial-02',
    title: '2. Setup',
    filename: 'tutorial-02-setup.json',
    content: `# Step 1: Project Setup

## Create a new project

\`\`\`bash
mkdir my-panel-app
cd my-panel-app
bun init -y
bun add ink react ink-panels
bun add -d tsx typescript @types/react @types/node
\`\`\`

## Configure TypeScript

Create a tsconfig.json:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
\`\`\`

## Project structure

Your project will look like this:

\`\`\`
my-panel-app/
  src/
    index.tsx          # Entry point + PanelStack
    PokemonList.tsx    # Custom panel component
    PokemonStats.tsx   # Another custom panel
  package.json
  tsconfig.json
\`\`\`

## Key concept: package.json type

Make sure your package.json has \`"type": "module"\` since ink-panels
and Ink are ESM-only:

\`\`\`json
{
  "type": "module"
}
\`\`\``,
  },
  {
    id: 'tutorial-03',
    title: '3. First Panel',
    filename: 'tutorial-03-first-panel.json',
    content: `# Step 2: Your First Panel

## The PanelProps interface

Every panel receives these props from PanelStack:

\`\`\`typescript
interface PanelProps<T = any> {
  data: T;                    // Your panel's data
  push: (panel) => void;      // Navigate forward
  pop: () => void;             // Go back
  replace: (panel) => void;    // Replace current
  updateState: (state) => void;// Update Claude state
  width: number;               // Terminal width
  height: number;              // Terminal height
}
\`\`\`

## Building the entry point

Create src/index.tsx -- this is where PanelStack lives:

\`\`\`typescript
import React from 'react';
import { render } from 'ink';
import { PanelStack, ListPanel } from 'ink-panels';
import type { PanelConfig } from 'ink-panels';

const pokemon = [
  { id: '1', name: 'Bulbasaur', type: 'Grass/Poison' },
  { id: '4', name: 'Charmander', type: 'Fire' },
  { id: '7', name: 'Squirtle', type: 'Water' },
  { id: '25', name: 'Pikachu', type: 'Electric' },
  { id: '39', name: 'Jigglypuff', type: 'Normal/Fairy' },
  { id: '133', name: 'Eevee', type: 'Normal' },
];

const rootPanel: PanelConfig = {
  id: 'pokemon-list',
  title: 'Pokemon',
  component: ListPanel,
  data: {
    title: 'Pokemon Explorer',
    items: pokemon.map(p => ({
      id: p.id,
      label: p.name,
      description: p.type,
      badge: '#' + p.id,
      badgeColor: 'yellow',
    })),
  },
};

const { unmount } = render(
  <PanelStack
    appName="pokemon-explorer"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
\`\`\`

## Run it!

\`\`\`bash
node --import tsx src/index.tsx
\`\`\`

You should see a scrollable list. j/k to move, q to quit.
But selecting an item does nothing yet -- that's next!`,
  },
  {
    id: 'tutorial-04',
    title: '4. Navigation',
    filename: 'tutorial-04-navigation.json',
    content: `# Step 3: Adding Navigation

## The onSelect callback

ListPanel supports an onSelect callback. When the user presses
Enter on an item, it fires with the item, index, and panelProps:

\`\`\`typescript
data: {
  title: 'Pokemon Explorer',
  items: [...],
  onSelect: (item, index, panelProps) => {
    // Push a new panel onto the stack!
    panelProps.push({
      id: 'detail-' + item.id,
      title: item.label,
      component: DetailPanel,
      data: {
        title: item.label,
        fields: [
          { label: 'ID', value: '#' + item.id },
          { label: 'Type', value: item.description },
          { label: 'Status', value: 'Wild' },
        ],
        actions: [],
      },
    });
  },
},
\`\`\`

## Update your index.tsx

Add the import for DetailPanel and the onSelect handler:

\`\`\`typescript
import { PanelStack, ListPanel, DetailPanel } from 'ink-panels';

// In rootPanel.data, add:
onSelect: (item, index, panelProps) => {
  const p = pokemon[index];
  panelProps.push({
    id: 'detail-' + p.id,
    title: p.name,
    component: DetailPanel,
    data: {
      title: p.name,
      fields: [
        { label: 'Pokedex #', value: '#' + p.id },
        { label: 'Type', value: p.type },
        { label: 'Generation', value: 'I' },
      ],
      actions: [
        {
          key: 's',
          label: 'View Stats',
          handler: (panelProps) => {
            // We'll build this next!
          },
        },
      ],
    },
  });
},
\`\`\`

## Navigation keys (handled by PanelStack)

- **Escape** -- go back (clears forward history)
- **[** -- go back (preserves forward history)
- **]** -- go forward
- **q** -- quit (at root panel only)

Now you can select a Pokemon and see its detail view.
Press Escape to go back. The breadcrumb trail updates
automatically at the bottom of the screen.`,
  },
  {
    id: 'tutorial-05',
    title: '5. Custom Panel',
    filename: 'tutorial-05-custom-panel.json',
    content: `# Step 4: Building a Custom Panel

Built-in panels (ListPanel, DetailPanel, TablePanel) are great,
but you'll want custom panels for specialized views.

## Create src/PokemonStats.tsx

\`\`\`typescript
import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import type { PanelProps } from 'ink-panels';

interface StatsData {
  name: string;
  type: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

function statBar(value: number, max: number): string {
  const width = 20;
  const filled = Math.round((value / max) * width);
  return '\\u2588'.repeat(filled)
       + '\\u2591'.repeat(width - filled);
}

export function PokemonStatsPanel(
  props: PanelProps<StatsData>
) {
  const { data, width, height, updateState } = props;
  const { name, type, stats } = data;

  useEffect(() => {
    updateState({ pokemon: name, viewing: 'stats' });
  }, [name]);

  const entries = Object.entries(stats);
  const maxStat = Math.max(...Object.values(stats));

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
    >
      <Box>
        <Text bold color="cyan">{name}</Text>
        <Text dimColor> - {type}</Text>
      </Box>
      <Box>
        <Text dimColor>
          {'\\u2500'.repeat(Math.min(width, 200))}
        </Text>
      </Box>

      {entries.map(([stat, val]) => (
        <Box key={stat} gap={1}>
          <Text bold>
            {stat.padEnd(10)}
          </Text>
          <Text color="green">
            {statBar(val, maxStat)}
          </Text>
          <Text dimColor> {val}</Text>
        </Box>
      ))}

      <Box flexGrow={1} />
      <Text dimColor>Esc:back</Text>
    </Box>
  );
}
\`\`\`

## Key rules for custom panels:

- Accept PanelProps<YourDataType> as props
- Use width/height for layout
- Call updateState() so Claude knows what's on screen
- Use push/pop/replace for navigation
- Use useInput() from ink for keyboard handling`,
  },
  {
    id: 'tutorial-06',
    title: '6. Wire It Up',
    filename: 'tutorial-06-wire-up.json',
    content: `# Step 5: Wiring It All Together

## Connect the stats panel to the detail view

Back in your index.tsx, fill in the "View Stats" action:

\`\`\`typescript
import { PokemonStatsPanel } from './PokemonStats.js';

// Inside the DetailPanel actions array:
actions: [
  {
    key: 's',
    label: 'View Stats',
    handler: (panelProps) => {
      panelProps.push({
        id: 'stats-' + p.id,
        title: p.name + ' Stats',
        component: PokemonStatsPanel,
        data: {
          name: p.name,
          type: p.type,
          stats: {
            hp: 45,
            attack: 49,
            defense: 49,
            speed: 45,
          },
        },
      });
    },
  },
],
\`\`\`

## The complete navigation flow

\`\`\`
ListPanel (Pokemon list)
  -- Enter --> DetailPanel (Pokemon detail)
    -- s --> PokemonStatsPanel (Stats bars)
    -- Esc --> back to detail
  -- Esc --> back to list
-- q --> quit
\`\`\`

## Launch it

\`\`\`bash
node --import tsx src/index.tsx
\`\`\`

## Or in TMUX alongside Claude Code

\`\`\`bash
tmux split-window -h -p 50 \\
  "node --import tsx src/index.tsx"
\`\`\`

The breadcrumb at the bottom shows:
> Home > Pokemon > Bulbasaur > Bulbasaur Stats`,
  },
  {
    id: 'tutorial-07',
    title: '7. Advanced',
    filename: 'tutorial-07-advanced.json',
    content: `# Step 6: Advanced Patterns

## Input Lock for Modal Editing

If your panel has text input (editing, search), PanelStack's
global keys (Escape, [, ], q) will interfere. Use useInputLock:

\`\`\`typescript
import { useInputLock } from 'ink-panels';

function MyEditPanel(props: PanelProps<EditData>) {
  const inputLock = useInputLock();
  const [editing, setEditing] = useState(false);

  useInput((input, key) => {
    if (input === 'e' && !editing) {
      setEditing(true);
      inputLock.lock();   // PanelStack ignores all keys
    }
    if (key.return && editing) {
      setEditing(false);
      inputLock.unlock(); // Give keys back
    }
  });
  // ...
}
\`\`\`

## Replace instead of Push

Use replace() when you want to update the current panel
without adding to the stack (e.g., refreshing data):

\`\`\`typescript
// Refresh the current panel with new data
props.replace({
  ...currentPanel,
  data: { ...currentPanel.data, items: newItems },
});
\`\`\`

## Claude State Integration

PanelStack writes ~/.claude/tui-state.json automatically.
Claude Code reads this to know what you're looking at:

\`\`\`json
{
  "app": "pokemon-explorer",
  "timestamp": "2026-02-19T10:30:00Z",
  "breadcrumb": ["Home", "Pokemon", "Pikachu"],
  "activePanel": {
    "id": "detail-25",
    "title": "Pikachu",
    "state": { "pokemon": "Pikachu" }
  }
}
\`\`\`

Call updateState() in your panels to enrich this:

\`\`\`typescript
useEffect(() => {
  updateState({
    pokemon: name,
    viewing: 'stats',
    hp: stats.hp,
  });
}, [name]);
\`\`\`

## TablePanel for Data Grids

\`\`\`typescript
import { TablePanel } from 'ink-panels';

const tablePanel: PanelConfig = {
  id: 'pokedex-table',
  title: 'Pokedex',
  component: TablePanel,
  data: {
    title: 'All Pokemon',
    columns: [
      { key: 'id', label: '#', width: 5 },
      { key: 'name', label: 'Name', width: 15 },
      { key: 'type', label: 'Type', width: 20 },
    ],
    rows: pokemon.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
    })),
    onSelect: (row, index, panelProps) => {
      // drill into row detail...
    },
  },
};
\`\`\`

TablePanel supports / for search, column sorting,
and scrolling through large datasets.`,
  },
  {
    id: 'tutorial-08',
    title: '8. Summary',
    filename: 'tutorial-08-summary.json',
    content: `# Summary

## What you learned

- **PanelStack** is the root component that manages navigation
- **PanelConfig** defines each panel (id, title, component, data)
- **Built-in panels:** ListPanel, DetailPanel, TablePanel
- **Custom panels** accept PanelProps and render with React/Ink
- **Navigation:** push(), pop(), replace()
- **Input Lock** prevents key conflicts during modal editing
- **State integration** keeps Claude informed via updateState()

## Quick reference

\`\`\`typescript
// PanelConfig
{
  id: string;
  title: string;
  component: React.ComponentType<PanelProps>;
  data: any;
  state?: Record<string, unknown>;
}

// Navigation
props.push(panelConfig);  // Go forward
props.pop();              // Go back
props.replace(config);    // Swap current

// Keys (handled by PanelStack)
// Escape = back    [ = back (keeps forward)
// ] = forward      q = quit (root only)
\`\`\`

## Explore the examples

\`\`\`bash
bun run explore:files     # File browser
bun run explore:scrum     # 5-level scrum board
bun run explore:db        # Database browser
bun run explore:yaml      # YAML config editor
bun run explore:clock     # Digital clock + timer
bun run explore:swarm     # SWARM project browser
bun run explore:sysmon    # System monitor
bun run explore:docs      # Markdown + code viewer
bun run explore:git       # Git dashboard
bun run explore:project   # Project dashboard
\`\`\`

## Run with TMUX

\`\`\`bash
tmux split-window -h -p 50 \\
  "node --import tsx src/index.tsx"
\`\`\`

**Happy building!**

> Built with ink-panels - stack-based terminal UIs for Claude Code`,
  },
];

// ─── Write all tutorial artifacts ────────────────────────

console.log('Injecting tutorial artifacts...');

for (const page of pages) {
  write(page.filename, {
    id: page.id,
    title: page.title,
    type: 'log',
    data: {
      title: page.title,
      content: page.content,
    },
    createdAt: new Date().toISOString(),
  });
}

console.log(`\nDone! ${pages.length} tutorial pages injected.`);
console.log('Launch the canvas viewer to read them:');
console.log('  bun run canvas');
