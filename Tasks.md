# Implementation Tasks

This document breaks down the implementation into actionable tasks organized by milestone. Each task is designed to be completable in a single development session.

---

## Milestone 1: Project Foundation

**Goal:** Working Next.js + TypeScript + SQLite + Drizzle app with Program CRUD

### Setup & Configuration

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M1.1 | Initialize Next.js project | `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" .` | App starts with `npm run dev` |
| M1.2 | Install dependencies | `npm i drizzle-orm better-sqlite3 zod @hookform/resolvers react-hook-form` + dev deps: `drizzle-kit @types/better-sqlite3` | `package.json` has all deps |
| M1.3 | Configure TypeScript strict mode | Update `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true` | `npm run tsc --noEmit` passes |
| M1.4 | Configure Drizzle | Create `drizzle.config.ts` pointing to `src/lib/db/schema` and `./drizzle` migrations folder | `npx drizzle-kit generate` works |
| M1.5 | Create `.env.example` | Placeholders for `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` | File exists with all keys |
| M1.6 | Create `.env.local` (gitignored) | Copy from example, add real values for local dev | App reads config correctly |
| M1.7 | Setup Drizzle database client | `src/lib/db/index.ts` with `drizzle(sqlite)` singleton | Importable without errors |
| M1.8 | Define database schema | `src/lib/db/schema/*.ts` for all tables in Architecture.md | `npx drizzle-kit generate` creates migration |
| M1.9 | Run initial migration | `npx drizzle-kit migrate` creates `dev.db` with tables | SQLite file exists with correct schema |
| M1.10 | Create Zod validation schemas | `src/lib/validation/*.ts` mirroring DB schema + API inputs | Schemas exportable, TypeScript types inferred |
| M1.11 | Build base UI layout | App shell with sidebar navigation, header, theme toggle | Responsive, accessible, dark/light mode |
| M1.12 | Implement Program CRUD API | `src/app/api/programs/route.ts` (GET, POST) + `[id]/route.ts` (GET, PATCH, DELETE) | All endpoints return validated JSON |
| M1.13 | Build Program List page | `/programs` - table with name, platform, status, score, actions | Sortable, filterable, paginated |
| M1.14 | Build Program Detail page | `/programs/[id]` - tabs scaffold (Overview, Scope, Assets, Features, Hypotheses, Evidence, Sessions, Reports) | Tabs render, data loads |
| M1.15 | Build Program Create/Edit form | Modal or page with React Hook Form + Zod, all fields from schema | Validation works, saves to DB |
| M1.16 | Add Program evaluation scoring | Configurable 0-5 dimensions, deterministic calculation, explanation | Score updates on field change, breakdown visible |
| M1.17 | Seed script | `scripts/seed.ts` with fictional programs (clearly labeled) | `npm run db:seed` populates DB |
| M1.18 | Unit tests - Program scoring | Test score calculation, edge cases, explanation output | `npm test` passes |
| M1.19 | Integration tests - Program CRUD | Test API routes with test DB, verify persistence | Tests pass, DB isolated per test |
| M1.20 | Lint + typecheck + test pipeline | `npm run lint && npm run typecheck && npm test` | All pass in CI |

---

## Milestone 2: Program Scope & Evidence

**Goal:** Scope records, exclusions, policy notes, Evidence CRUD, full-text search, program evaluation

### Scope & Policy Management

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M2.1 | Scope/Policy API routes | CRUD for assets, exclusions, rate limits, reward ranges under `/api/programs/[id]/scope` | All scope entities manageable via API |
| M2.2 | Scope UI in Program Detail | "Scope & Rules" tab with sections for in-scope assets, exclusions, allowed/prohibited methods, rate limits, rewards | Data displays correctly, editable |
| M2.3 | Program evaluation UI | Dedicated section with 6 dimensions (attack surface, scope clarity, reward suitability, complexity, opportunity, skill fit), 0-5 each, total + breakdown | Sliders/inputs update score live |
| M2.4 | Evidence CRUD API | `/api/programs/[id]/evidence` + `[evidenceId]` routes, all evidence types from spec | Full CRUD with validation |
| M2.5 | Evidence Create/Edit form | Form with type selector, title, content (markdown), source URL, tags, verification status, confidence | Saves correctly, links to program |
| M2.6 | Evidence List view | Filterable table in Program Detail "Evidence" tab, shows type, title, source, date, verification | Filters work, pagination |
| M2.7 | Evidence Detail view | Modal/page showing full content, metadata, linked hypotheses, hash | All fields visible |
| M2.8 | Full-text search setup | Add FTS5 virtual table for evidence content + titles, sync triggers | Search returns ranked results |
| M2.9 | Search API + UI | `/api/search?q=` endpoint, global search bar in header, results grouped by type | Fast, relevant results |
| M2.10 | Source reference tracking | Every evidence record stores source_url, collected_at, content_hash, metadata_json | Provenance preserved |
| M2.11 | Fact vs Interpretation UI distinction | Evidence form has separate "Observed Fact" and "Interpretation/Notes" fields | Clear separation enforced |
| M2.12 | Unit tests - Scope classification | Test in-scope/out-of-scope logic, exclusions override | All cases covered |
| M2.13 | Unit tests - Evidence validation | Test hash generation, type enum, required fields | Edge cases pass |
| M2.14 | Integration tests - Evidence + Scope | Test linking evidence to assets/hypotheses, FTS search | Data integrity maintained |

---

## Milestone 3: Feature & Endpoint Mapping

**Goal:** Feature inventory, endpoint records, roles, CSV/JSON imports, sanitized HTTP notes

### Feature Management

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M3.1 | Feature API routes | CRUD under `/api/programs/[id]/features`, link to asset, roles, resource types, security properties | Full CRUD, relational integrity |
| M3.2 | Feature UI | "Assets & Features" tab - asset tree with features, inline add/edit, roles/resource types as structured fields | Hierarchical display, editable |
| M3.3 | Endpoint API routes | CRUD under `/api/programs/[id]/endpoints`, link to feature, asset, all spec fields | All endpoint fields supported |
| M3.4 | Endpoint UI | Tab/table in "Assets & Features" with filters (asset, feature, method, scope status, test status) | Sortable, filterable, bulk actions |
| M3.5 | CSV Import for endpoints | Parse CSV, validate against Zod schema, preview before import, map columns, error reporting | Imports valid rows, rejects invalid with reasons |
| M3.6 | JSON Import for endpoints | Same as CSV but for JSON arrays, supports nested structures | Works for API doc exports |
| M3.7 | Sanitized HTTP Request/Response import | Paste raw HTTP, auto-redact headers (Cookie, Auth, API keys), preview, save as evidence + link to endpoint | Redaction works, evidence created |
| M3.8 | Role & Resource Ownership modeling | Feature form includes roles_json (array), resource_types_json, expected_security_properties_json | Structured data, queryable |
| M3.9 | Scope status on endpoints | Each endpoint has scope_status (in_scope, out_of_scope, unknown) with reason field, not auto-inferred | Explicit, auditable |
| M3.10 | Testing status tracking | endpoint.test_status (untested, testing, tested_vulnerable, tested_secure, blocked) | Visible in UI, filterable |
| M3.11 | Unit tests - Import validation | Malformed CSV/JSON, missing required fields, type mismatches | Clear error messages |
| M3.12 | Integration tests - Endpoint linking | Endpoint → Feature → Asset → Program chain, cascade deletes | Referential integrity |

---

## Milestone 4: AI Provider & Hypothesis Engine

**Goal:** Provider adapter, structured validation, hypothesis generation, evidence retrieval, priority calculation, AI run history, approval gates

### AI Provider Adapter

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M4.1 | Define `ResearchAI` interface | TypeScript interface in `src/lib/ai/adapter.ts` matching Architecture.md | Compiles, all methods typed |
| M4.2 | Implement OpenAI provider | `src/lib/ai/providers/openai.ts` with structured output (function calling / JSON mode) | Works with real API key |
| M4.3 | Implement Anthropic provider (optional) | Same interface, different provider | Swappable via config |
| M4.4 | AI Run logging | `ai_runs` table insert on every call: task_type, provider, model, prompt_version, input_refs, output, validation_status | Complete audit trail |
| M4.5 | Error handling & retries | Rate limit backoff, timeout, malformed output, provider errors → structured error types | No crashes, errors logged |
| M4.6 | Model selection config | Settings page: choose provider, model, max_tokens, temperature per task type | Persists, used in calls |
| M4.7 | Prompt versioning | Prompt templates in `src/lib/ai/prompts/` with version constants, included in ai_runs | Reproducible runs |

### Hypothesis Engine

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M4.8 | Hypothesis Zod schemas | Input/output schemas for generation, analysis, prioritization | Validates all AI I/O |
| M4.9 | Evidence retrieval for hypotheses | Service method: given program/feature/hypothesis, fetch relevant evidence chunks (FTS + metadata filter) | Returns bounded, relevant set |
| M4.10 | Hypothesis generation API | `POST /api/programs/[id]/hypotheses/generate` - calls AI with retrieved context, validates output, saves drafts | Returns 1-5 structured hypotheses |
| M4.11 | Hypothesis CRUD API | Full CRUD for hypotheses, status transitions validated | All lifecycle states enforced |
| M4.12 | Hypothesis UI - List | "Hypotheses" tab: filterable by status, priority, feature; shows title, category, score, status badge | Sortable, bulk actions |
| M4.13 | Hypothesis UI - Detail | Full view: statement, plausibility, evidence (supporting/contradicting), assumptions, test plan, expected outcomes, priority breakdown, status history, actions | All fields editable where appropriate |
| M4.14 | Priority calculation engine | Deterministic function implementing formula from spec, weights configurable in settings, breakdown stored | Transparent, reproducible |
| M4.15 | Priority UI | Breakdown visible on hypothesis detail, sliders to adjust weights in settings, live preview | Changes reflect immediately |
| M4.16 | Human approval gate | `PolicyApprovalGate` service: `approveForTesting(hypothesisId, researcherId)` validates scope, policy, rate limits, returns approval record | Blocks if any check fails |
| M4.17 | Approve for Testing button | In hypothesis detail, only enabled when status=Ready for Review, calls approval gate, transitions to Approved for Testing | Audit trail created |
| M4.18 | AI Hypothesis Analysis | "Request AI Analysis" button: re-runs generation with current evidence, suggests status changes with reasoning | Output reviewed before apply |
| M4.19 | Unit tests - Priority calculation | Test formula with various weights, edge cases (negative scores, bounds) | Mathematically correct |
| M4.20 | Unit tests - AI output validation | Invalid IDs, missing fields, type mismatches rejected | No invalid data persists |
| M4.21 | Integration tests - Generation flow | Mock AI provider, test retrieval → generation → validation → save | End-to-end works |

---

## Milestone 5: Research Sessions

**Goal:** Session creation, observation recording, hypothesis state transitions, handoff summaries, next actions

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M5.1 | Session CRUD API | `/api/programs/[id]/sessions` + `[sessionId]`, link to hypothesis, objective, timestamps | Full lifecycle |
| M5.2 | Session UI - List | "Sessions" tab in Program Detail, shows active/completed, objective, hypothesis, dates | Filterable |
| M5.3 | Session UI - Active Session View | Dedicated page `/programs/[id]/sessions/[sessionId]` with: context panel, hypothesis detail, observation log, next actions | Real-time feel |
| M5.4 | Observation Recording | Form in active session: test description, expected/actual result, evidence links, conclusion (supported/disproved/inconclusive) | Appends to session log |
| M5.5 | Test Observations API | CRUD for `test_observations` table, linked to session + hypothesis | Queryable by session/hypothesis |
| M5.6 | Hypothesis Status Transitions | UI buttons for each valid transition (Draft→Needs Evidence→Ready for Review→Approved→Testing→Supported/Disproved/Inconclusive/Confirmed/Rejected) | Invalid transitions blocked |
| M5.7 | Status History | Every transition logged with timestamp, user, reason (optional) | Audit trail visible |
| M5.8 | Handoff Summary Generation | "End Session" button: AI generates summary (verified facts, new assumptions, hypothesis updates, tests performed, unconfirmed findings, missing evidence, next steps, sources) | Structured, evidence-linked |
| M5.9 | Handoff Summary UI | Display generated summary, researcher can edit before saving, saved to `research_sessions.handoff_summary` | Editable, persisted |
| M5.10 | Session Resume | "Resume Session" loads handoff summary, shows next steps, pre-fills context | Seamless continuation |
| M5.11 | Next Actions Tracking | `next_steps_json` array in session, each with description, priority, assignee (self), due date | Actionable checklist |
| M5.12 | Unit tests - Status transitions | Test all valid/invalid transitions, audit log creation | State machine correct |
| M5.13 | Integration tests - Session flow | Create session → add observations → transition hypothesis → end session → resume | Data consistency |

---

## Milestone 6: Report Builder

**Goal:** Draft generation, evidence references, reproduction steps, impact/remediation, Markdown export, human review

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M6.1 | Report Zod schemas | Input (from confirmed finding) and output (draft report) schemas | Validates structure |
| M6.2 | Report Drafting API | `POST /api/programs/[id]/reports/draft` - calls AI with hypothesis + evidence + test observations, returns structured draft | No invented data |
| M6.3 | Report Draft UI | "Reports" tab: list drafts, "Create Draft" button (only for Confirmed findings), draft editor with all sections | Sections editable |
| M6.4 | Report Sections Editor | Each section (Title, Summary, Asset/Endpoint, Preconditions, Steps, Expected/Actual, Evidence, Impact, Remediation, Scope Refs) as editable field with evidence picker | Evidence links insert as citations |
| M6.5 | Evidence Citation System | `[[evidence:ID]]` syntax in editor, renders as linked reference with hover preview | Traceable |
| M6.6 | Markdown Export | "Export Markdown" button generates .md file with all sections, proper formatting, evidence appendix | Clean, portable output |
| M6.7 | Report Review Status | `report_status` (draft, in_review, approved, submitted), only researcher can change | Workflow enforced |
| M6.8 | AI Report Drafting Prompt | Template that strictly uses provided evidence, never invents requests/responses/impact | Safe by design |
| M6.9 | Unit tests - Report generation | Test markdown output structure, citation rendering, no invented data | Output valid |
| M6.10 | Integration tests - Full report flow | Hypothesis confirmed → draft → edit → export → status changes | End-to-end works |

---

## Milestone 7: Reliability & Security

**Goal:** Input validation, secret redaction, localhost defaults, error handling, DB backup, automated tests, dependency checks

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| M7.1 | Global input validation middleware | Zod validation on all API routes, consistent error responses | No unvalidated input reaches services |
| M7.2 | Secret Redaction Library | `src/lib/security/redaction.ts` - functions for headers, cookies, keys, PII, configurable patterns | Used in evidence import, HTTP import |
| M7.3 | Redaction UI | Evidence/HTTP import shows preview with redactions highlighted, researcher can adjust before save | Transparent, controllable |
| M7.4 | Localhost-only binding | `next.config.js` and dev script bind to 127.0.0.1, document how to override | Not exposed by default |
| M7.5 | CSRF Protection | Next.js built-in + custom for API routes where needed | Verified with test |
| M7.6 | File Upload Security | Size limits, type validation, path sanitization, no execution, storage outside web root | Safe by default |
| M7.7 | Error Boundaries & Logging | React error boundaries, API error handler, structured logging (no secrets), user-friendly error pages | No crashes leak info |
| M7.8 | Database Backup/Export | CLI script `npm run db:export` → JSON/CSV, `npm run db:import` for restore | Works, tested |
| M7.9 | Automated Test Suite | GitHub Actions / local: lint, typecheck, unit, integration, security tests on every push | CI passes |
| M7.10 | Dependency Auditing | `npm audit` in CI, `package-lock.json` committed, Dependabot configured | No high/critical vulns |
| M7.11 | Security Test Cases | Automated tests for: model file access, command execution, network requests, tool override, scope bypass, HTML rendering, secret logging, cross-program isolation | All pass |
| M7.12 | Documentation | `SECURITY.md` with threat model, data handling, red limits, incident response | Complete |

---

## Milestone 8: Optional Research Automation (Post-MVP)

*Only after Milestones 1-7 are stable*

| ID | Task | Description |
|----|------|-------------|
| M8.1 | Official advisory feed ingestion | GitHub Advisory Database, vendor advisories, NVD - scheduled fetch |
| M8.2 | Advisory matching engine | Compare fetched advisories against recorded tech stack, create hypothesis drafts |
| M8.3 | Duplicate hypothesis detection | Semantic similarity check before creating new hypotheses |
| M8.4 | Program policy change monitoring | Periodic re-fetch of program URLs, diff detection, notification |
| M8.5 | Endpoint inventory comparison | Diff imported endpoint lists over time, highlight changes |
| M8.6 | Advanced Retrieval (Vector) | Add embeddings if FTS5 recall insufficient, hybrid search |
| M8.7 | Research Action Review Queue | AI-suggested actions (new hypothesis, re-test, doc review) pending researcher approval |

---

## Cross-Cutting Tasks (Ongoing)

| ID | Task | Description |
|----|------|-------------|
| X.1 | Accessibility Audit | WCAG 2.1 AA compliance for all new UI |
| X.2 | Performance Budgets | Bundle size, DB query latency, AI response time targets |
| X.3 | Documentation Updates | Keep README, Architecture.md, API docs in sync |
| X.4 | Seed Data Maintenance | Realistic fictional data for all entity types |
| X.5 | Settings Persistence | User preferences (theme, AI weights, model) in localStorage + DB |

---

## Task Dependency Graph

```
M1.1 → M1.2 → M1.3 → M1.4 → M1.5 → M1.6 → M1.7 → M1.8 → M1.9
                                                              ↓
M1.10 ← M1.11 ← M1.12 ← M1.13 ← M1.14 ← M1.15 ← M1.16 ← M1.17
                                                              ↓
M1.18 → M1.19 → M1.20 (Milestone 1 Complete)
                                                              ↓
M2.1 → M2.2 → M2.3 → M2.4 → M2.5 → M2.6 → M2.7 → M2.8 → M2.9
                                                              ↓
M2.10 → M2.11 → M2.12 → M2.13 → M2.14 (Milestone 2 Complete)
                                                              ↓
M3.1 → M3.2 → M3.3 → M3.4 → M3.5 → M3.6 → M3.7 → M3.8 → M3.9
                                                              ↓
M3.10 → M3.11 → M3.12 (Milestone 3 Complete)
                                                              ↓
M4.1 → M4.2 → M4.3 → M4.4 → M4.5 → M4.6 → M4.7
                                                              ↓
M4.8 → M4.9 → M4.10 → M4.11 → M4.12 → M4.13 → M4.14 → M4.15
                                                              ↓
M4.16 → M4.17 → M4.18 → M4.19 → M4.20 → M4.21 (Milestone 4 Complete)
                                                              ↓
M5.1 → M5.2 → M5.3 → M5.4 → M5.5 → M5.6 → M5.7 → M5.8 → M5.9
                                                              ↓
M5.10 → M5.11 → M5.12 → M5.13 (Milestone 5 Complete)
                                                              ↓
M6.1 → M6.2 → M6.3 → M6.4 → M6.5 → M6.6 → M6.7 → M6.8 → M6.9
                                                              ↓
M6.10 (Milestone 6 Complete)
                                                              ↓
M7.1 → M7.2 → M7.3 → M7.4 → M7.5 → M7.6 → M7.7 → M7.8 → M7.9
                                                              ↓
M7.10 → M7.11 → M7.12 (Milestone 7 Complete)
```

---

## Definition of Done (Per Task)

- [ ] Code written and formatted (`prettier --write`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Unit tests written and passing
- [ ] Integration tests written (for API/DB tasks)
- [ ] Manual verification completed
- [ ] No console errors in browser
- [ ] Accessible (keyboard nav, ARIA labels, contrast)
- [ ] Documented in code (JSDoc for public APIs)

---

## Milestone Acceptance Criteria (Summary)

| Milestone | Demo Scenario |
|-----------|---------------|
| **M1** | Create/edit/delete program, see it persist after restart, score calculates |
| **M2** | Add scope assets/exclusions, create evidence records, search finds them |
| **M3** | Import endpoints from CSV, link to features, see scope/test status |
| **M4** | Generate hypotheses for a feature, see evidence-linked breakdown, approve one for testing |
| **M5** | Start session, record observations, transition hypothesis, end session with handoff, resume next day |
| **M6** | From confirmed hypothesis, draft report, edit all sections, export clean Markdown |
| **M7** | App resists security test cases, exports/imports DB, CI passes |

---

## Estimated Effort (Rough)

| Milestone | Tasks | Est. Days (Solo) |
|-----------|-------|------------------|
| 1 | 20 | 5-7 |
| 2 | 14 | 4-5 |
| 3 | 12 | 3-4 |
| 4 | 21 | 7-10 |
| 5 | 13 | 4-5 |
| 6 | 10 | 3-4 |
| 7 | 12 | 3-4 |
| **Total (MVP)** | **102** | **29-39** |

---

## Next Steps

1. **Start Milestone 1** - Initialize project, get "Hello World" with DB working
2. **Daily Standup** - Track progress against task list
3. **Milestone Reviews** - Demo at end of each milestone before proceeding
4. **Adjust Scope** - If tasks take longer, defer M8 items, never compromise M1-M7 security