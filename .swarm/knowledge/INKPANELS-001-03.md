---
id: "K-001-03"
source_story: "INKPANELS-001"
source_repo: "ink-panels"
created: "2026-02-19T10:30:00Z"
author: "frontend-dev"
dimension: "praxeology"
scope: "repo"
hoistable: false
hoisted_to: null
hoisted_at: null
confidence: "high"
tags: ["panels", "state", "navigation"]
domain: "panel-navigation"
title: "Panel state restoration via PanelConfig.state"
supersedes: null
ttl: null
---

# Panel state restoration via PanelConfig.state

## Context

When a user navigates into a detail panel (push) and returns (pop), the parent panel loses its selection and scroll position because `useState(0)` initializes fresh.

## Description

Thread `state` from `PanelConfig` through `PanelStack` into `PanelProps`. The navigation stack already preserves PanelConfig objects, so state comes for free. Panels initialize from `props.state?.selectedIndex ?? 0` and call `updateState()` on changes. On pop, the previous panel's state is still in the stack entry.

## Recommendation

Always initialize selection/scroll state from `props.state` with a fallback default. Call `updateState()` whenever user-visible state changes so it persists across navigation. This pattern works for any panel type, not just ListPanel.

## Evidence

- Source story: `INKPANELS-001`
- Discovered by: frontend-dev
- Confidence: high
