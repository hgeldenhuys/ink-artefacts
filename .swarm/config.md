---
project: ink-panels
prefix: INKPANELS
counter: 1
definition_of_ready:
  - Problem statement is clearly defined
  - Acceptance criteria are testable
  - Complexity has been estimated
  - Technical approach has been sketched
definition_of_done:
  - All acceptance criteria are passing
  - Code compiles without errors
  - All tests pass
  - Linting passes with no errors
  - Retrospective has been generated
  - Knowledge has been extracted
ways_of_working:
  testing: test-first
  review: required
  documentation: standard
  effort_model: tshirt
  max_parallel_agents: 3
  auto_verify: true
  knowledge_extraction: true
  knowledge_auto_hoist: false
---

# ink-panels — SWARM Configuration

## Team Conventions

- **Runtime:** Bun
- **Language:** TypeScript
- **Linter / Formatter:** Biome

## Agent Roles

| Agent | Role | Focus Area |
|-------|------|------------|
| backend-dev | Backend Developer | APIs, services, data layer |
| frontend-dev | Frontend Developer | UI components, pages, UX |
| qa-engineer | QA Engineer | Testing, verification, quality |
| architect | Architect | System design, patterns, ADRs |
| tech-writer | Tech Writer | Documentation, guides, changelogs |
| devops | DevOps Engineer | CI/CD, infrastructure, deployment |

## Story Lifecycle

```
draft → ideating → planned → executing → verifying → done → archived
                ↘                                   ↗
              awaiting_input ──────────────────────┘
```

Each phase is executed by the corresponding SWARM skill:
1. `swarm-ideate` — Problem decomposition & acceptance criteria
2. `swarm-plan` — Task breakdown & agent assignment
3. `swarm-execute` — Implementation with agent coordination
4. `swarm-verify` — Automated & manual verification
5. `swarm-close` — Retrospective, knowledge extraction, archival
