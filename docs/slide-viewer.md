# SlideViewer — Terminal Presentations

Present markdown slide decks in the terminal using `ink-panels`.

## Quick Start

### 1. Install ink-panels

```bash
# In your project
npm install ink-panels ink react
# or
bun add ink-panels ink react
```

> **Runtime:** Use Node.js (not Bun) to run Ink apps — Bun has stdin issues with `useInput`.

### 2. Create your slides

Create a file (e.g. `slides.ts`) with an array of `Slide` objects:

```typescript
import type { Slide } from 'ink-panels';

export const slides: Slide[] = [
  {
    title: 'Welcome',
    body: `
# My Presentation

> A tagline or subtitle here.

---

*Navigate with arrow keys or h/l*
`,
  },
  {
    title: 'Key Point',
    body: `
# The Key Point

- First thing
- Second thing
- Third thing

> A memorable quote or callout.
`,
  },
  {
    title: 'Architecture',
    body: `
# System Architecture

\`\`\`
  ┌──────────┐     ┌──────────┐
  │  Client   │────>│  Server   │
  └──────────┘     └────┬─────┘
                        │
                   ┌────▼─────┐
                   │ Database  │
                   └──────────┘
\`\`\`

ASCII diagrams render great in code blocks.
`,
  },
  {
    title: 'Conclusion',
    body: `
# Thank You

That's all folks.
`,
  },
];
```

### 3. Create the entry point

```typescript
// present.tsx
import React from 'react';
import { render } from 'ink';
import { SlideViewer } from 'ink-panels';
import { slides } from './slides.js';

const startSlide = Math.max(0, parseInt(process.argv[2] || '1', 10) - 1);

const { unmount, waitUntilExit } = render(
  <SlideViewer
    slides={slides}
    appName="my-presentation"
    startSlide={startSlide}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />
);

waitUntilExit().then(() => process.exit(0));
```

### 4. Run it

```bash
node --import tsx present.tsx        # Start from slide 1
node --import tsx present.tsx 3      # Start from slide 3
```

## Navigation

| Key          | Action               |
|--------------|----------------------|
| `l` or `→`   | Next slide           |
| `h` or `←`   | Previous slide       |
| `g`          | First slide          |
| `G`          | Last slide           |
| `j` or `↓`   | Scroll down          |
| `k` or `↑`   | Scroll up            |
| `PgDn`       | Page down            |
| `PgUp`       | Page up              |
| `q`          | Quit                 |
| `Q`          | Quit (from anywhere) |
| `Esc`        | Quit                 |

## Slide Format

Each slide has two fields:

```typescript
interface Slide {
  title: string;  // Shown in footer + breadcrumb
  body: string;   // Markdown content
}
```

The `body` is rendered using [marked](https://github.com/markedjs/marked) + [marked-terminal](https://github.com/mikaelbr/marked-terminal), which means you get:

- **Headers** (`# H1`, `## H2`, etc.)
- **Bold** and *italic*
- `Code spans` and code blocks with syntax highlighting
- Tables (rendered with box-drawing characters)
- Blockquotes
- Lists (ordered and unordered)
- Horizontal rules (`---`)
- Links

## API

### `<SlideViewer>`

| Prop         | Type       | Default        | Description                      |
|--------------|------------|----------------|----------------------------------|
| `slides`     | `Slide[]`  | *required*     | Array of slides to present       |
| `appName`    | `string`   | `'slide-deck'` | App name for state file          |
| `startSlide` | `number`   | `0`            | 0-indexed starting slide         |
| `onExit`     | `() => void` | —            | Called when user quits           |

### `Slide` type

```typescript
import type { Slide } from 'ink-panels';
```

## Tips

- Keep slides concise — terminal real estate is limited
- Use ASCII art in code blocks for diagrams
- Tables render with box-drawing characters automatically
- Horizontal rules (`---`) make good visual separators
- Use `>` blockquotes for callouts and emphasis
- Test your slides in a full-size terminal (not a tiny split pane)

## Example

The built-in example presents "The Anatomy of an AI Coding Agent":

```bash
# From the ink-panels repo
npm run slides
```

The slide content is in `examples/slide-deck/slides.ts` — use it as a template for your own presentations.
