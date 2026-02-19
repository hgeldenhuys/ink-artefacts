---
id: "K-001-02"
source_story: "INKPANELS-001"
source_repo: "ink-panels"
created: "2026-02-19T10:30:00Z"
author: "frontend-dev"
dimension: "qualia"
scope: "repo"
hoistable: false
hoisted_to: null
hoisted_at: null
confidence: "medium"
tags: ["bookmarks", "keys", "collision"]
domain: "bookmarks"
title: "Colon separator collision in bookmark keys"
supersedes: null
ttl: null
---

# Colon separator collision in bookmark keys

## Context

The bookmark system uses flat keys in the format `canvasName:panelId:itemId` to store bookmark state in a JSON file. This works for simple identifiers.

## Description

If any item ID contains a colon character, the flat key format becomes ambiguous. For example, `viewer:files:path:to:file` cannot be reliably split back into its three components.

## Recommendation

For now this is acceptable since item IDs are typically numeric indices or simple strings. If item IDs start containing colons (e.g., file paths, URIs), switch to a null-byte separator or use a nested JSON structure `{canvas: {panel: {item: true}}}`.

## Evidence

- Source story: `INKPANELS-001`
- Discovered by: frontend-dev
- Confidence: medium
