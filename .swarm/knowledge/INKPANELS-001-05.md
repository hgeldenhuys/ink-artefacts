---
id: "K-001-05"
source_story: "INKPANELS-001"
source_repo: "ink-panels"
created: "2026-02-19T10:30:00Z"
author: "architect"
dimension: "epistemology"
scope: "repo"
hoistable: false
hoisted_to: null
hoisted_at: null
confidence: "high"
tags: ["events", "logging", "claude", "shared-context"]
domain: "canvas-events"
title: "JSONL for Claude-queryable event logs"
supersedes: null
ttl: null
---

# JSONL for Claude-queryable event logs

## Context

The canvas viewer needs to log user interactions so Claude can answer questions like "what was the last file I viewed?" or "show me my recent bookmarks."

## Description

Append-only JSONL (one JSON object per line) at `~/.claude/canvas-events.jsonl` is ideal for this use case. Each line contains a self-contained event with timestamp, session ID, canvas name, panel, action, and target payload. Claude can grep the file directly without parsing the entire contents.

## Recommendation

Use JSONL for any append-only log that Claude needs to query. Advantages over alternatives: (1) vs SQLite — no binary dependencies, greppable; (2) vs JSON array — can append without reading/rewriting the whole file; (3) vs plain text — structured and parseable. Include session IDs so events can be filtered per conversation.

## Evidence

- Source story: `INKPANELS-001`
- Discovered by: architect
- Confidence: high
