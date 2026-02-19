---
name: tmux-open
description: Open any command in a TMUX split pane. Use when the user says "open vi", "open htop", "show me top", "launch lazygit", "open a terminal", or wants any interactive command running alongside Claude Code. Triggers on "open X in tmux", "split pane", "tmux open", or when the user asks to open an interactive CLI tool.
---

# Open Command in TMUX Pane

Launch any command in a TMUX split pane next to Claude Code.

## Instructions

1. Parse the user's request for the command they want to run.
2. Check if a TMUX session is active with `tmux list-sessions`.
3. **CRITICAL: Pane safety checks before ANY tmux action:**

### Before opening a new pane

Check if there's already a side pane running:

```bash
# Read the stored pane ID (if any)
PANE_ID=$(cat ~/.claude/tmux-side-pane 2>/dev/null)

# Check if that pane still exists
if [ -n "$PANE_ID" ] && tmux list-panes -F '#{pane_id}' | grep -q "$PANE_ID"; then
  echo "Side pane already running: $PANE_ID"
  # DON'T open another one — the pane is already there
else
  echo "No side pane — safe to open one"
fi
```

### Opening a new pane

When opening, capture and save the pane ID:

```bash
# Open the pane and capture its ID
tmux split-window -h -p 50 -P -F '#{pane_id}' "<command>" | tee ~/.claude/tmux-side-pane
```

The `-P -F '#{pane_id}'` flags print the new pane's ID so we can track it.

### Closing the side pane (when needed)

ONLY close the tracked side pane, NEVER guess:

```bash
PANE_ID=$(cat ~/.claude/tmux-side-pane 2>/dev/null)
if [ -n "$PANE_ID" ]; then
  tmux kill-pane -t "$PANE_ID" 2>/dev/null
  rm -f ~/.claude/tmux-side-pane
fi
```

**NEVER use `tmux kill-pane -t <index>` — always use the saved pane ID.**

### Canvas viewer special case

If the command is a `claude:*` inject command (tasks, files, context, dashboard, tutorial):
1. First check if the canvas viewer is already running in the side pane
2. If YES: just run the inject command locally (no tmux needed — fs.watch picks it up)
3. If NO: inject the artifact, then open the canvas viewer in a new side pane

```bash
# Check if canvas is already running
PANE_ID=$(cat ~/.claude/tmux-side-pane 2>/dev/null)
if [ -n "$PANE_ID" ] && tmux list-panes -F '#{pane_id}' | grep -q "$PANE_ID"; then
  # Canvas already open — just inject, it auto-updates via fs.watch
  bun run claude:tasks
else
  # No canvas — inject then open viewer
  bun run claude:tasks
  tmux split-window -h -p 50 -P -F '#{pane_id}' "bun run claude:canvas" | tee ~/.claude/tmux-side-pane
fi
```

### Options

- Default split is 50% horizontal (side by side).
- If the user asks for vertical (top/bottom), use `-v` instead of `-h`.
- If the user specifies a size percentage, use `-p <percent>`.

### Examples

| User says | Command |
|-----------|---------|
| "open vi" | `tmux split-window -h -p 50 -P -F '#{pane_id}' "vi" \| tee ~/.claude/tmux-side-pane` |
| "open htop" | `tmux split-window -h -p 50 -P -F '#{pane_id}' "htop" \| tee ~/.claude/tmux-side-pane` |
| "open canvas" | `tmux split-window -h -p 50 -P -F '#{pane_id}' "bun run claude:canvas" \| tee ~/.claude/tmux-side-pane` |
| "claude:tasks" | Check if canvas pane exists → inject only if yes, inject + open if no |
| "claude:context" | Check if canvas pane exists → inject only if yes, inject + open if no |

### Error Handling

- If no TMUX session is active, tell the user they need to run Claude Code inside TMUX first.
- If the command is not found, suggest installing it.
- **NEVER kill a pane by index number** — always use the saved pane ID from `~/.claude/tmux-side-pane`.
- **NEVER open a duplicate pane** — always check if one is already running first.
