---
id: "K-001-04"
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
tags: ["features", "api-design", "backwards-compatibility"]
domain: "component-design"
title: "Opt-in features via optional props"
supersedes: null
ttl: null
---

# Opt-in features via optional props

## Context

Adding new features (like bookmarks) to existing components risks breaking callers that don't need the feature.

## Description

Guard new features behind optional props. For bookmarks in ListPanel, the feature only activates when both `canvasName` and `panelId` are provided in the data prop. Existing callers that don't pass these props see zero behavior change.

## Recommendation

When adding a new capability to an existing component, make it conditional on new optional props. Use a boolean guard (`const bookmarksEnabled = Boolean(canvasName && panelId)`) and check it before any feature-specific logic. This keeps the component backwards-compatible without feature flags.

## Evidence

- Source story: `INKPANELS-001`
- Discovered by: frontend-dev
- Confidence: high
