---
id: "K-001-01"
source_story: "INKPANELS-001"
source_repo: "ink-panels"
created: "2026-02-19T10:30:00Z"
author: "backend-dev"
dimension: "epistemology"
scope: "repo"
hoistable: false
hoisted_to: null
hoisted_at: null
confidence: "high"
tags: ["hooks", "events", "react"]
domain: "canvas-events"
title: "Non-hook event logging export pattern"
supersedes: null
ttl: null
---

# Non-hook event logging export pattern

## Context

When logging canvas interaction events from both React components and plain callback functions (like `useInput` handlers), a React hook alone is insufficient because hooks can't be called conditionally or from non-component code.

## Description

Export both a React hook (`useCanvasEvents`) and a plain function (`logCanvasEvent`) from the same module. The hook provides debouncing and lifecycle management, while the plain function enables fire-and-forget logging from callbacks, event handlers, and non-component code.

## Recommendation

When building cross-cutting concerns that need to fire from both React components and plain callbacks, always provide a non-hook utility function alongside the hook. The hook can delegate to the utility internally.

## Evidence

- Source story: `INKPANELS-001`
- Discovered by: backend-dev
- Confidence: high
