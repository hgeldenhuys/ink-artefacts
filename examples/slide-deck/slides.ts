/**
 * Slide content for "The Anatomy of an AI Coding Agent" presentation.
 *
 * Each slide has a title (shown in breadcrumb) and markdown body.
 * The viewer renders markdown via marked + marked-terminal.
 */

import type { Slide } from '../../src/index.js';

// ─── Robot ASCII Art Variants ─────────────────────────────
//
// The robot has 4 parts: Brain, Spine, Body, Limbs.
// Each variant highlights one part with heavy box-drawing
// characters while the rest stays in lighter single lines.

const ROBOT_ALL = `
            ┌───────────┐
            │  ◉     ◉  │   Brain
            │     △     │
            └─────┬─────┘
                  ║          Spine
            ┌─────╨─────┐
       ━━━━━┤  ░ ░ ░ ░  ├━━━━━
            │  ░ ░ ░ ░  │   Body + Limbs
            └─────┬─────┘
                ╱   ╲
               ╱     ╲      Limbs
`;

const ROBOT_BRAIN = `
            ╔═══════════╗
            ║  ◉     ◉  ║ ◄─ THE BRAIN
            ║     △     ║    thinks, reasons,
            ╚═════╤═════╝    plans, decides
                  │
            ┌─────┴─────┐
       ─────┤  · · · ·  ├─────
            │  · · · ·  │
            └─────┬─────┘
                ╱   ╲
               ╱     ╲
`;

const ROBOT_SPINE = `
            ┌───────────┐
            │  ·     ·  │
            │     ·     │
            └─────┬─────┘
                  ║
                  ║ ◄─ THE SPINE
                  ║    prompt → think →
                  ║    act → observe → repeat
            ┌─────╨─────┐
       ─────┤  · · · ·  ├─────
            │  · · · ·  │
            └─────┬─────┘
                ╱   ╲
               ╱     ╲
`;

const ROBOT_BODY = `
            ┌───────────┐
            │  ·     ·  │
            │     ·     │
            └─────┬─────┘
                  │
            ╔═════╧═════╗
       ═════╣  ░ ░ ░ ░  ╠═════
            ║  ░ ░ ░ ░  ║ ◄─ THE BODY
            ╚═════╤═════╝    permissions,
                ╱   ╲        sandbox, auth
               ╱     ╲
`;

const ROBOT_LIMBS = `
            ┌───────────┐
            │  ·     ·  │
            │     ·     │
            └─────┬─────┘
                  │
            ┌─────┴─────┐
       ━━━━━┥  · · · ·  ┝━━━━━ ◄─ read, write,
            │  · · · ·  │        search, run
            └─────┬─────┘
                ╱   ╲
               ╱     ╲  ◄─ THE LIMBS
`;

const ROBOT_FULL = `
            ╔═══════════╗
            ║  ◉     ◉  ║   Brain
            ║     △     ║
            ╚═════╤═════╝
                  ║          Spine
            ╔═════╧═════╗
       ━━━━━╣  ░ ░ ░ ░  ╠━━━━━
            ║  ░ ░ ░ ░  ║   Body
            ╚═════╤═════╝
                ╱   ╲
               ╱     ╲      Limbs
`;

// ─── Slides ───────────────────────────────────────────────

export const slides: Slide[] = [
  // ─── Title ──────────────────────────────────────────────
  {
    title: 'Title',
    body: `
# The Anatomy of an AI Coding Agent

\`\`\`
${ROBOT_ALL}
\`\`\`

> From a brain in a jar to a builder that ships.

---

*Navigate with arrow keys or h/l — q to quit*
`,
  },

  // ─── What You Already Have ──────────────────────────────
  {
    title: 'What You Have',
    body: `
# What You Already Have

## Co-Pilot + Claude Models

You have access to Claude through your existing subscription
— a powerful LLM that can reason about code, explain systems,
and generate solutions.

But an LLM alone is just a **brain in a jar**.

It can think. It can plan. It can write beautiful code.

But it can't open a file. It can't run a test.
It can't check if its own solution actually works.

> **What if it could actually *do* things?**
`,
  },

  // ─── The Anatomy ────────────────────────────────────────
  {
    title: 'The Anatomy',
    body: `
# The Anatomy

Think of an AI coding agent like a body:

| Component        | Analogy            | What It Does                              |
|------------------|--------------------|-------------------------------------------|
| **LLM**          | The Brain          | Thinks, reasons, plans                    |
| **Scaffolding**  | The Spine          | Connects the brain to everything else     |
| **Harness**      | The Body           | Holds it all together, gives it structure |
| **Tools**        | Limbs & Senses     | Reads files, runs code, searches, edits   |

\`\`\`
${ROBOT_ALL}
\`\`\`

Each layer is essential. Remove any one, and the agent falls apart.
`,
  },

  // ─── The Brain ──────────────────────────────────────────
  {
    title: 'The Brain',
    body: `
# The LLM — The Brain

\`\`\`
${ROBOT_BRAIN}
\`\`\`

The large language model is the intelligence layer.

- Understands natural language instructions
- Reasons about code architecture and bugs
- Plans multi-step solutions
- Decides **which** tools to use and **when**
- Generates code, tests, documentation

It's the part that can look at a stack trace
and *know* the fix is three files away.

> **It's brilliant — but without a body, it can only talk.**
`,
  },

  // ─── The Spine ──────────────────────────────────────────
  {
    title: 'The Spine',
    body: `
# The Scaffolding — The Spine

\`\`\`
${ROBOT_SPINE}
\`\`\`

The scaffolding is the communication layer
between the brain and the body.

- Manages the **conversation loop**:
  prompt → response → action → observe → repeat
- Formats tool calls and parses results
- Handles context windows and token management
- Implements the **agentic loop** — the heartbeat of autonomy

This is the difference between a chatbot and an agent.
A chatbot responds once. An agent **iterates until done**.

> **Without the spine, the brain can't send signals to the limbs.**
`,
  },

  // ─── The Body ───────────────────────────────────────────
  {
    title: 'The Body',
    body: `
# The Harness — The Body

\`\`\`
${ROBOT_BODY}
\`\`\`

The harness is the runtime environment
that holds everything together.

- Manages authentication and permissions
- Provides the execution sandbox
- Enforces safety boundaries
- Connects to your infrastructure (APIs, repos, services)

Your permissions. Your repos. Your environment.

> **The harness is what makes it *your* agent, not just *an* agent.**
`,
  },

  // ─── The Limbs ──────────────────────────────────────────
  {
    title: 'The Limbs',
    body: `
# The Tools — Limbs & Senses

\`\`\`
${ROBOT_LIMBS}
\`\`\`

Tools are how the agent interacts with the real world.

- **Read files** — eyes on the codebase
- **Write/edit files** — hands that type
- **Run commands** — legs that move through the system
- **Search** — ears listening for relevant context
- **Browser / APIs** — reaching out beyond the local machine

Without tools, the best the LLM can do is
*tell you* what to type. With tools, it types it itself.

> **Tools turn a conversation into action.**
`,
  },

  // ─── How They Fit Together ──────────────────────────────
  {
    title: 'Together',
    body: `
# How They Fit Together

\`\`\`
${ROBOT_FULL}
\`\`\`

The brain decides. The spine dispatches.
The tools execute. The harness keeps it all safe.

\`\`\`
  User: "fix the bug in auth.py"
    │
    ▼
  Brain   → "I need to read auth.py first"
  Spine   → dispatches Read tool call
  Limbs   → reads the file, returns content
  Brain   → "I see the issue on line 42"
  Spine   → dispatches Edit tool call
  Limbs   → applies the fix
  Brain   → "let me verify with tests"
  Spine   → dispatches Bash tool call
  Limbs   → runs pytest, all green
  Brain   → "done."
\`\`\`
`,
  },

  // ─── The Loop ───────────────────────────────────────────
  {
    title: 'The Loop',
    body: `
# The Agentic Loop

This is the real magic — the cycle that makes
an agent more than a one-shot generator.

\`\`\`
              ┌──────────┐
              │  Prompt   │
              └─────┬────┘
                    │
                    ▼
              ┌──────────┐
         ┌───▶│  Think    │  LLM reasons about the task
         │    └─────┬────┘
         │          │
         │          ▼
         │    ┌──────────┐
         │    │   Act     │  calls a tool
         │    └─────┬────┘
         │          │
         │          ▼
         │    ┌──────────┐
         └────│ Observe   │  reads the result
              └──────────┘
\`\`\`

Each loop brings the agent closer to done.
A simple bug fix: ~3 loops. A complex feature: ~30.

> **Autonomy is just a loop with good judgment.**
`,
  },

  // ─── What This Gives You ────────────────────────────────
  {
    title: 'What You Get',
    body: `
# What This Proxy Gives You

\`\`\`
  Before:                After:
  ┌───────────┐          ╔═══════════╗
  │  ◉     ◉  │          ║  ◉     ◉  ║
  │     △     │          ║     △     ║
  └───────────┘          ╚═════╤═════╝
                               ║
  just a brain           ╔═════╧═════╗
  in a jar          ━━━━━╣  ░ ░ ░ ░  ╠━━━━━
                         ║  ░ ░ ░ ░  ║
                         ╚═════╤═════╝
                             ╱   ╲
                            ╱     ╲

                         a full agent
\`\`\`

**You already had:** the brain (Claude models)

**Now you also get:** the spine, the body, and the limbs

- No new accounts. No new billing.
- Just a more capable Claude.

> The distance between *talking about code*
> and *writing code* is the distance between
> a brain and a body.
`,
  },

  // ─── Let's See It ───────────────────────────────────────
  {
    title: 'Demo',
    body: `
# Let's See It In Action

\`\`\`
            ╔═══════════╗
            ║  ◉     ◉  ║
            ║     △     ║    This slide deck is being
            ╚═════╤═════╝    presented by Claude Code
                  ║          itself.
            ╔═════╧═════╗
       ━━━━━╣  ░ ░ ░ ░  ╠━━━━━
            ║  ░ ░ ░ ░  ║    It read files from disk.
            ╚═════╤═════╝    It rendered markdown.
                ╱   ╲        It handles your keys.
               ╱     ╲
                             That's the anatomy
                             in action.
\`\`\`

Brain + Spine + Body + Limbs
= **an agent that doesn't just talk — it builds.**
`,
  },
];
