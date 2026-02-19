---
story_id: "INK-000"
title: "Framework setup retrospective"
completed: "2026-02-17T18:00:00Z"
duration: "2d 8h"
agents_involved: ["architect", "frontend-dev", "devops"]
repo: "ink-panels"
metrics:
  tasks_total: 5
  tasks_completed: 5
  acs_total: 3
  acs_passing: 3
  files_changed: 12
  tests_added: 0
  cycle_time_hours: 56
---

# INK-000 Retrospective: Framework Setup

## What Went Well
- Clean separation between navigation hooks and panel components
- useRef mirroring pattern solved all state timing issues
- TMUX integration worked on first attempt

## What Could Improve
- Should add unit tests for usePanelNavigation
- Input lock API could be more ergonomic (context-based)
- No error boundaries for panel crashes

## Learnings by Agent

### architect
- Stack-based navigation with breadcrumbs is intuitive for hierarchical data
- The PanelProps interface (push/pop/replace/updateState) is sufficient for all navigation patterns

### frontend-dev
- React 19 setState timing caught us off guard — always use useRef for synchronous state
- Ink's Box component with flexDirection="column" is the workhorse of all layouts

### devops
- Node.js is mandatory for Ink (Bun stdin issues)
- TMUX -c flag is critical for setting working directory in split panes
