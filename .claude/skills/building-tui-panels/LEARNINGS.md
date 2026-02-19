# Learnings

## Input Lock for Modal Panels (2026-02-18)

PanelStack's `useInput` handler fires for ALL key events, including Escape, `[`, `]`, and `q`. When a child panel has modal input (text editing, search mode), these keys conflict. Solution: use `useInputLock()` hook — call `lock()` when entering modal mode, `unlock()` when leaving. PanelStack checks `isLocked()` before handling global keys.

## YAML Editor Pattern (2026-02-18)

Schema-driven forms work well with ink-panels:
- Flatten nested YAML into rows with section headers for objects
- Color-code field names by type (green=string, yellow=number, blue=boolean, magenta=enum)
- Put a color legend in the header instead of per-row type badges — less visual noise
- Use dot-path notation for nested value access (`database.port`)
- Boolean: toggle on Space/Enter, Enum: cycle on Space/Enter/←/→, String/Number: Enter for inline edit mode

## React 19 Dev Mode Key Warning

React 19 in dev mode sometimes prints garbled key warnings where the "key" shown is actually a stack trace. This is a React dev-mode artifact, not a real duplicate key issue. Safe to ignore.
