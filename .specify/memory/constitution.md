<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: none (new file)
Added sections:
  - Core Principles (I–V)
  - Technology Constraints
  - Development Workflow
  - Governance
Removed sections: none
Templates reviewed:
  - .specify/templates/plan-template.md       ⚠ pending manual review
  - .specify/templates/spec-template.md       ⚠ pending manual review
  - .specify/templates/tasks-template.md      ⚠ pending manual review
Deferred TODOs: none
-->

# SenseWorld Constitution

## Core Principles

### I. Provider-Plugin Architecture

All third-party service integrations (LLM, Speech, Avatar) MUST be implemented
behind a typed interface (`LLMProvider`, `SpeechProvider`, `AvatarProvider`).
No business logic may directly instantiate a concrete vendor SDK — it MUST go
through the corresponding Factory. Adding a new vendor requires only implementing
the interface; no changes to business logic are permitted.

### II. Operator-Configurable Runtime

All vendor selections, API keys, System Prompt, and service parameters MUST be
configurable at runtime through the admin panel without restarting the service.
Database configuration takes precedence over environment variables. Hard-coded
vendor defaults in source code are forbidden.

### III. No Emoji Policy

Emoji characters are PROHIBITED in all project artifacts: source code, comments,
documentation, commit messages, spec files, plan files, task files, and UI copy.
This rule applies to all contributors and all AI-generated content.

### IV. Spec-Driven Development

Every feature MUST begin with an approved `spec.md` before any implementation
starts. The development sequence is non-negotiable: `speckit.specify` →
`speckit.plan` → `speckit.tasks` → `speckit.implement`. No code may be merged
for a feature that lacks a corresponding approved spec and plan.

### V. Security-First Secrets Handling

No credentials, API keys, or passwords may be committed to the repository in any
form. All secrets MUST be injected via environment variables. Passwords stored
in the database MUST use a non-reversible hash. The `.env.example` file MUST
contain only placeholder values, never real credentials.

## Technology Constraints

- Framework: Next.js 14 App Router + TypeScript (strict mode)
- UI: Tailwind CSS + shadcn/ui — no other CSS frameworks may be introduced
- Database: MySQL via Prisma ORM — raw SQL queries are prohibited except in
  migration files
- Streaming: Server-Sent Events (SSE) for all AI response streaming
- Container: Docker Compose for all deployment environments
- Node.js: 20 LTS or above
- No client-side state management library may be added without a constitution
  amendment

## Development Workflow

- Features are developed in the order listed in `PLAN.md`; skipping features
  requires explicit user approval and a PLAN.md update
- Each feature lives on its own branch named `###-feature-name`
- A feature is considered complete only when its `spec.md` acceptance scenarios
  all pass and `PLAN.md` status is updated to done
- All database schema changes MUST go through Prisma migrations — direct DDL
  against the database is prohibited
- The `/api/health` endpoint MUST remain functional at all times; CI MUST verify
  it before any merge

## Governance

This constitution supersedes all other project conventions and README guidance
where they conflict. Amendments require:
1. A `/speckit.constitution` invocation describing the change
2. Version increment per semantic versioning rules defined in the spec-kit skill
3. Updated `LAST_AMENDED_DATE`

All spec reviews and code reviews MUST verify compliance with this constitution.
Any principle violation found during review blocks merge until resolved.

**Version**: 1.0.0 | **Ratified**: 2025-01-30 | **Last Amended**: 2025-01-30
