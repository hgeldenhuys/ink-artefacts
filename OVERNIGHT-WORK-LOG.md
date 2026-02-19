# Overnight Work Log - Feb 19, 2026

## Goals
1. Study recursive-ai repo, build ink-panels to view/interact with its data
2. Research ink ecosystem libraries, build a new compelling demo
3. 5 human-hours of work budget

## Timeline

### Phase 1: Research - DONE
- [x] Study recursive-ai architecture, CLI commands, data formats
- [x] Research ink ecosystem libraries for demo ideas

### Phase 2: Build recursive-ai panels - DONE
- [x] Design panel structure for recursive-ai visualization
- [x] Implement multi-level SWARM Explorer
- [x] Test with sample SWARM data (5 stories, 3 knowledge items, 1 retro)

### Phase 3: Build new demo from ink libraries - DONE
- [x] Chose: Real-time system monitor with Unicode charts
- [x] Built: CPU sparklines, memory bars, disk usage, top processes

### Phase 4: Polish & document - DONE
- [x] Update README with new examples
- [x] Add npm scripts for both new demos

## Results

### 1. SWARM Explorer (`examples/swarm-explorer/`)
**What:** Interactive terminal UI for browsing recursive-ai SWARM projects.

**Navigation hierarchy:**
```
Dashboard (status bars, metrics, knowledge counts)
  -> [s] Stories list (sorted by status, with task/AC summaries)
    -> Story detail (metadata, problem statement)
      -> [a] Acceptance criteria (pass/fail icons, evidence)
      -> [t] Tasks (status icons, agent assignments, effort)
        -> Task detail (dependencies, AC coverage)
  -> [k] Knowledge base (E/Q/P dimension badges)
    -> Knowledge detail (description, context, recommendation)
  -> [r] Retrospectives list
    -> Retro detail (metrics, full markdown body)
```

**Key features:**
- Reads real `.swarm/` directory structure (backlog, archive, knowledge, retrospectives)
- Parses YAML frontmatter from markdown files (same format as recursive-ai)
- Status-sorted story list with color-coded badges for status and priority
- Task dependency visualization
- Knowledge items tagged by dimension (E=Pattern, Q=Pain Point, P=Best Practice)
- Works with sample data out of the box, or point at any SWARM-initialized project

**Files created:**
- `examples/swarm-explorer/index.tsx` - Entry point
- `examples/swarm-explorer/SwarmExplorer.tsx` - All panels (Dashboard, Stories, Story Detail, ACs, Tasks, Knowledge, Retros)
- `examples/swarm-explorer/swarm-parser.ts` - Frontmatter parser and SWARM data types
- `examples/swarm-explorer/sample-swarm/` - 5 stories, 3 knowledge items, 1 retrospective, config

**Run:** `bun run explore:swarm` or `node --import tsx examples/swarm-explorer/index.tsx [.swarm-path]`

---

### 2. System Monitor (`examples/system-monitor/`)
**What:** Real-time system dashboard with live-updating metrics.

**Display:**
- **CPU:** Usage percentage + progress bar + load averages + 60-second sparkline history
- **Memory:** Usage percentage + progress bar + used/total in human-readable format + sparkline
- **Disk:** Per-volume usage bars with size info
- **Processes:** Top 8 by CPU with PID, name, CPU%, MEM% columns

**Key features:**
- Auto-refreshes every 1.5 seconds
- Unicode sparkline characters (▁▂▃▄▅▆▇█) for historical trends
- Color-coded thresholds: green (<40%), cyan (<70%), yellow (<90%), red (>90%)
- Rolling 60-sample history for CPU and memory sparklines
- macOS-focused but cross-platform fallbacks

**Files created:**
- `examples/system-monitor/index.tsx` - Entry point
- `examples/system-monitor/SystemMonitor.tsx` - Dashboard component
- `examples/system-monitor/metrics.ts` - OS metrics collectors + Unicode rendering helpers

**Run:** `bun run explore:sysmon` or `node --import tsx examples/system-monitor/index.tsx`

---

### 3. Earlier Session Work (also completed tonight)
- **Stop hook fix:** Added `Stop` hook event to settings.json so TaskCreate/TaskUpdate changes propagate to the canvas viewer
- **Live data fix:** Fixed `ArtifactPanel` to detect descriptor data changes via `useRef` + `useEffect`, solving the stale panel content bug
- **Files diff panel:** Built `diff-list` artifact type with DiffViewPanel renderer showing Edit operations as red/green inline diffs
- **Dashboard hook updates:** Capture `old_string`/`new_string` from Edit tool, store diffs in state, write `diff-list` artifacts

### 4. Continuation Session — Ink Ecosystem Demos

#### Retrospective Fixes Applied
- Wired `writeContextArtifact()` into `main()` (was defined but never called)
- Capped diff storage: 10 per file, 100 total across all files
- Added hook error logging to `~/.claude/dashboard-hook-errors.log`
- Added "last updated" timestamp to canvas viewer tab bar

#### Ink Library Compatibility Testing
Installed and tested all the ink ecosystem libraries from the user's list:
- **Compatible (Ink 6 + React 19):** `ink-big-text`, `ink-gradient`, `ink-spinner`, `ink-syntax-highlight`, `marked` + `marked-terminal`
- **Incompatible (CJS/yoga-layout issues):** `ink-table`, `ink-task-list` (CJS `require('ink')` triggers top-level await error in yoga-layout)
- **Incompatible (React 19):** `ink-divider` (bundles its own old ink with react-reconciler expecting React 18 internals)
- Removed incompatible packages, kept only working ones

#### 4a. Doc Reader (`examples/doc-reader/`)
**What:** Browse and read documentation with rich rendering.
- Markdown files rendered with `marked` + `marked-terminal` (headers, bold, code blocks, lists)
- Source files get `ink-syntax-highlight` with language auto-detection
- Scrollable with vim keys, file browser filtered to docs + source files

**Files:** `index.tsx`, `MarkdownPanel.tsx`, `CodePanel.tsx`
**Run:** `bun run explore:docs` or `node --import tsx examples/doc-reader/index.tsx [dir]`

#### 4b. Git Dashboard (`examples/git-dashboard/`)
**What:** Interactive git repository overview.
- Giant gradient repo name header (`ink-big-text` + `ink-gradient`)
- Loading spinner (`ink-spinner`) while collecting data
- Tabbed sections: Commits, Branches, Changes, Stats
- Drill into commit details, branch lists, contributor bar charts
- All data from real `git` commands via `execSync`

**Files:** `index.tsx`, `GitDashboard.tsx`, `git-data.ts`
**Run:** `bun run explore:git` or `node --import tsx examples/git-dashboard/index.tsx [repo-path]`

#### 4c. Project Dashboard (`examples/project-dashboard/`)
**What:** Beautiful Node.js project overview.
- Gradient project name header, loading spinner
- Health checks: README, tests, CI, TypeScript, linter, CLAUDE.md
- File type distribution with Unicode bar charts
- Dependency browser (prod/dev split), script viewer with syntax highlighting
- Directory size breakdown, TODO/FIXME counter
- Recursive directory scanning (skips node_modules, .git, dist, etc.)

**Files:** `index.tsx`, `ProjectDashboard.tsx`, `project-data.ts`
**Run:** `bun run explore:project` or `node --import tsx examples/project-dashboard/index.tsx [path]`

## What's Next (suggestions for future sessions)
- Connect SWARM Explorer to live `fs.watch()` so panels update when stories are modified
- Add task status editing from within the TUI (write-back to YAML frontmatter)
- Run `recursive init` on the ink-panels project to create a real `.swarm/` directory
- Add `recursive validate` and `recursive transition` commands as panel actions
- Fix ink-table/ink-task-list/ink-divider compatibility or contribute PRs upstream
- Add search/filter to doc-reader file browser
- Git dashboard: add diff --stat for staged/unstaged changes
- Project dashboard: add `npm outdated` or `bun outdated` check for deps
