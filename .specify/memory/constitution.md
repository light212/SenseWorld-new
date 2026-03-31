<!--
Sync Impact Report
==================
Version change: 1.2.0 → 1.2.1 (patch — VII corrected: pnpm replaces npm)
Modified principles: VII. Package Manager Uniformity (npm → pnpm)
Added sections: none
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
starts. The development sequence is non-negotiable: `speckit.specify` ->
`speckit.plan` -> `speckit.tasks` -> `speckit.implement`. No code may be merged
for a feature that lacks a corresponding approved spec and plan.

### V. Security-First Secrets Handling

No credentials, API keys, or passwords may be committed to the repository in any
form. All secrets MUST be stored in `.env.local` (gitignored) or the database
`Config` table. `.env.example` MUST document every required variable with a
placeholder value only. Any commit containing a real secret is grounds for
immediate branch deletion and secret rotation.

### VI. Directory Structure Consistency

All feature implementations MUST reuse the directory structure established by
`001-project-scaffold`. Provider implementations are placed in their designated
directories:

- LLM Providers: `lib/ai/`
- Speech Providers: `lib/speech/`
- Avatar Providers: `lib/avatar/`
- MCP integrations: `lib/mcp/`

Creating functionally equivalent parallel directories (e.g., `lib/llm/`,
`lib/providers/`) is PROHIBITED. When spec-kit generates documents that reference
conflicting paths, those paths MUST be corrected during the tasks phase before
implementation begins.

### VII. Package Manager Uniformity

This project uses `pnpm` as the sole package manager. All install commands in
`tasks.md` files, documentation, and CI scripts MUST use `pnpm add`. The use
of `npm install`, `yarn`, or `bun` is PROHIBITED unless the user explicitly amends
this principle. Lock file: `pnpm-lock.yaml` only.

## Technology Constraints

- **Runtime**: Node.js 20 LTS; no runtime switching without a constitution amendment
- **Framework**: Next.js 14 App Router; Pages Router patterns are forbidden in new code
- **Database ORM**: Prisma 5; raw SQL queries against the application database is prohibited
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

**Version**: 1.2.1 | **Ratified**: 2025-01-30 | **Last Amended**: 2025-07-14
