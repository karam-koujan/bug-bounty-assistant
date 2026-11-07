# Security Policy

This document describes the threat model, data-handling rules, hard limits, and
incident-response baseline for the Bug Bounty AI Research Assistant
(Milestone 7.12).

## Product model

A **local-first, single-user** desktop application. It stores research notes,
evidence, hypotheses and reports in a local SQLite file and optionally calls a
hosted AI provider on the researcher's behalf. It is a research assistant, not
an autonomous exploitation platform.

## Threat model

| Threat | Mitigation |
|--------|------------|
| Malicious web page triggers state-changing API call (CSRF) | Proxy (`src/proxy.ts`) rejects cross-origin POST/PUT/PATCH/DELETE on `/api/*`; fail closed on malformed Origin |
| Untrusted document (program policy, advisory, HTTP response) contains instructions | Imported content is data only; system prompts separate retrieved material; AI outputs validated against Zod schemas; fabricated evidence IDs stripped |
| Secrets leak into stored evidence or AI prompts | `src/lib/security/redaction.ts` redaction applied to HTTP request/response evidence on ingest; researcher-facing preview before saving (M7.3) |
| Model accesses files, executes commands, or makes network calls | Not in the tool surface at all — the AI adapter has no tool execution path (`Architecture.md` hard restrictions) |
| App exposed to LAN/other users | Dev/start scripts bind to `127.0.0.1` only; document how to override deliberately |
| Malicious upload (malware, path traversal) | Upload validation: size ≤ 2 MB, CSV/JSON/plain only, executable/script extensions rejected, filenames flattened to safe basenames (`src/lib/security/upload.ts`) |
| Secret leakage via logs | Structured logger scrubs messages and metadata through the redaction library before emit |
| Crash leaks sensitive stack traces in UI | Error boundaries show generic messages; full details stay in local logs |
| Vulnerable dependencies | CI runs `npm audit --audit-level=high`; Dependabot on npm + GitHub Actions |
| Cross-program data leakage | All queries program-scoped; covered by security tests |

## Data handling

- **Stored where:** SQLite file `dev.db` (or `DATABASE_URL`), entirely local.
- **Sent off the machine:** only content explicitly passed to the configured AI
  provider (hypothesis generation, observation analysis, drafting). Evidence is
  passed after redaction; program policy text is data, never instructions.
- **No live credentials** are stored in research tables. When recording HTTP
  evidence,就是为了 avoid capturing live session cookies in the first place: the
  preview highlights `Authorization`, `Cookie`, and API tokens so the
  researcher can redact before saving.
- Redaction is regex-based and **conservative but not exhaustive**; the
  researcher remains responsible for the final content they save.

## Red limits (hard boundaries)

1. No automatic exploitation; every active test requires explicit researcher
   approval recorded in the app.
2. The model cannot execute shell commands, make network requests, or mutate
   the database directly.
3. No testing of out-of-scope assets, no automatic crawling, no automatic
   report submission.
4. API keys live in server-side env vars only; never logged.

## Backup / restore

- `npm run db:export` — JSON snapshot (or `--csv <table>`) into `./backups/`.
- `npm run db:import` — restore; refuses to overwrite non-empty DBs unless
  `--force` is given.

## Incident response baseline

This is a local single-user tool, so incidents are degraded-data or leaked-key
scenarios:

1. If an AI API key is suspected leaked, revoke it at the provider immediately
   and replace it in `.env.local` (never committed).
2. If bad data entered the DB (unredacted secrets), delete the evidence record,
   restore from an export made before the incident, and re-ingest redacted
   content.
3. If cross-program data loss is suspected, use `db:export` immediately to
   snapshot current state, then file an issue in this repository before making
   schema changes.
4. Vulnerable dependency found: run `npm audit` for details, upgrade, and
   re-run `npm run test`.

## Reporting a vulnerability in the app itself

Open a GitHub issue (this is a private local tool; no bug bounty covers it).
