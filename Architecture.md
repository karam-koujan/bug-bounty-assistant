# Architecture Document

## Overview

This document describes the architecture for the **Bug Bounty AI Research Assistant** — a local-first, single-user application that helps security researchers systematically investigate authorized bug bounty programs. The application is a research assistant, not an autonomous exploitation platform. It prioritizes evidence, maintains persistent research state, and makes every recommendation traceable to its supporting information.

---

## Core Architectural Principles

| Principle | Description |
|-----------|-------------|
| **Evidence before speculation** | Every claim must be backed by recorded evidence |
| **One hypothesis at a time** | Focused investigation workflow |
| **Testability** | Every hypothesis must be testable with expected outcomes |
| **Persistence** | Research state survives across sessions |
| **Traceability** | AI recommendations are reviewable and auditable |
| **Human approval** | Active testing requires explicit researcher approval |
| **Scope precedence** | Program rules override AI suggestions |
| **No AI confirmation** | Vulnerabilities are confirmed only by evidence + researcher approval |

**Golden Rule:** *The AI proposes. Deterministic application code validates. The researcher approves.*

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Researcher                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js UI (App Router)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Dashboard│ │Programs │ │Assets   │ │Hypotheses│ │Evidence │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │Sessions │ │ Reports │ │Settings │ │        │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Services Layer                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │ Program Mgmt     │ │ Scope & Policy   │ │ Evidence &     │  │
│  │ Service          │ │ Mgmt Service     │ │ Document       │  │
│  └──────────────────┘ └──────────────────┘ │ Ingestion Svc  │  │
│  ┌──────────────────┐ ┌──────────────────┐ └────────────────┘  │
│  │ Hypothesis       │ │ Research Session │ ┌────────────────┐  │
│  │ Engine           │ │ Manager          │ │ Report Builder │  │
│  └──────────────────┘ └──────────────────┘ └────────────────┘  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │ AI Provider      │ │ Policy & Approval│ │                │  │
│  │ Adapter          │ │ Gate             │ │                │  │
│  └──────────────────┘ └──────────────────┘ └────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database                             │
│  (Drizzle ORM • Migrations • Zod Validation)                    │
└─────────────────────────────────────────────────────────────────┘

External Information Sources (Untrusted Data):
  • Program pages & policies
  • Official documentation
  • Security advisories
  • Researcher-provided notes
  • Sanitized HTTP requests/responses
  • Authorized application observations
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (lightweight, accessible)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Next.js Server Components, Server Actions, API Routes
- **Database:** SQLite (local file)
- **ORM:** Drizzle ORM with migrations
- **Validation:** Zod (runtime + compile-time)

### AI Integration
- **Pattern:** Provider-independent adapter
- **First Provider:** Configurable hosted model API (e.g., OpenAI, Anthropic)
- **Requirements:**
  - API keys in server-side env vars only
  - Structured outputs validated against Zod schemas
  - Model/prompt version metadata stored
  - Rate limits, timeouts, errors handled gracefully
  - No dependency on proprietary agent frameworks

### Development Environment
- Node.js LTS + npm
- SQLite (file-based, no server)
- Git
- `.env.local` for secrets (never committed)
- `.env.example` with placeholders

---

## Application Services (Domain Layer)

Each service encapsulates a single domain responsibility:

| Service | Responsibility |
|---------|----------------|
| **ProgramManagementService** | CRUD for programs, evaluation scoring, status transitions |
| **ScopePolicyService** | Scope records, exclusions, allowed/prohibited methods, rate limits |
| **EvidenceIngestionService** | Document import, chunking, FTS indexing, source tracking, redaction |
| **HypothesisEngineService** | Generation, prioritization, status lifecycle, evidence linking |
| **ResearchSessionService** | Session lifecycle, observation recording, handoff summaries |
| **ReportBuilderService** | Draft generation from confirmed findings, Markdown export |
| **AIProviderAdapter** | Abstract interface for LLM calls, structured output validation |
| **PolicyApprovalGate** | Enforces scope, validates permissions, requires human approval |

---

## Database Schema (SQLite + Drizzle)

### Core Tables

```
programs
├── id, name, platform, program_url
├── policy_text, policy_reviewed_at
├── research_status (inbox|evaluating|ready|active|paused|archived)
├── evaluation_scores_json, notes
└── created_at, updated_at

assets
├── id, program_id, asset_identifier, asset_type
├── scope_status, restrictions_json
├── evidence_id (FK), notes

features
├── id, program_id, asset_id, name, description
├── roles_json, resource_types_json
├── expected_security_properties_json, notes

endpoints
├── id, program_id, asset_id, feature_id
├── method, path_template, purpose
├── authentication_requirement, expected_authorization
├── source_evidence_id, test_status, notes

evidence
├── id, program_id, evidence_type, title, content
├── source_url, collected_at, verification_status
├── content_hash, metadata_json

hypotheses
├── id, program_id, feature_id, title, statement, category
├── supporting_evidence_json, contradicting_evidence_json
├── assumptions_json, prerequisites_json
├── test_plan, expected_vulnerable_result, expected_safe_result
├── potential_impact, status, priority_score, priority_breakdown_json
├── created_at, updated_at

research_sessions
├── id, program_id, hypothesis_id, objective
├── session_notes, handoff_summary, next_steps_json
├── started_at, ended_at

test_observations
├── id, session_id, hypothesis_id, test_description
├── expected_result, actual_result, evidence_ids_json
├── conclusion, created_at

reports
├── id, program_id, hypothesis_id, title, summary
├── reproduction_steps_json, expected_behavior, actual_behavior
├── demonstrated_impact, remediation, report_status
├── created_at, updated_at

ai_runs
├── id, task_type, provider, model, prompt_version
├── input_reference_ids_json, output_json
├── validation_status, created_at
```

**Design Notes:**
- Foreign keys + indexes on all relationships
- JSON columns for flexible metadata (not entire state)
- Normalized relational records for core entities
- No live credentials, session cookies, or API tokens in research tables

---

## AI Service Interface

```typescript
interface ResearchAI {
  evaluateProgram(input: ProgramEvaluationInput): Promise<ProgramEvaluation>;
  analyzeFeature(input: FeatureAnalysisInput): Promise<FeatureAnalysis>;
  generateHypotheses(input: HypothesisGenerationInput): Promise<Hypothesis[]>;
  analyzeObservation(input: ObservationAnalysisInput): Promise<ObservationAnalysis>;
  researchAdvisory(input: AdvisoryResearchInput): Promise<AdvisoryAnalysis>;
  generateSessionSummary(input: SessionSummaryInput): Promise<SessionSummary>;
  draftReport(input: ReportDraftInput): Promise<ReportDraft>;
}
```

### Structured AI Response Format

Every AI response distinguishes:
- **Facts** — verifiable observations
- **Assumptions** — explicit premises
- **Inferences** — reasoned conclusions
- **Unknowns** — explicitly acknowledged gaps
- **Supporting Evidence IDs** — references to recorded evidence
- **Contradicting Evidence IDs** — references to conflicting evidence
- **Recommended Next Actions** — concrete, testable steps

**Validation Rules:**
- All evidence IDs validated against accessible records
- No fabricated IDs allowed
- Provider errors don't corrupt research records
- Model cannot directly execute shell commands, HTTP requests, or DB mutations

---

## Document Ingestion & Retrieval

### MVP Approach
1. Store source documents + notes
2. Split long documents into bounded chunks
3. Preserve document identity + source location
4. Search via SQLite FTS5
5. Retrieve relevant chunks per program/feature/hypothesis
6. Record which sources were supplied to the model
7. Source-aware citations in AI outputs

### Untrusted Document Protection
- Imported content = **data only**, never instructions
- Never follow embedded instructions
- Never let document text alter scope permissions
- Never let external content trigger tool execution
- Separate system instructions from retrieved material
- Preserve provenance + source references
- Avoid exposing secrets through model context

---

## Security & Safety Architecture

### Hard Restrictions (MVP)
- ✅ No automatic vulnerability exploitation
- ✅ No unrestricted shell access for the model
- ✅ No arbitrary network requests from the model
- ✅ No automatic scanning of discovered assets
- ✅ No autonomous crawling
- ✅ No testing of excluded/third-party assets without authorization
- ✅ No automatic report submission
- ✅ No automatic modification/deletion of target data

### Scope Enforcement
Before any network-testing feature:
1. Documented target asset ✓
2. Current program policy ✓
3. Explicit testing permission ✓
4. Approved action + method ✓
5. Applicable rate limits ✓
6. Researcher confirmation ✓

**Fail closed:** Uncertainty → No automated request

### Evidence Sanitization
Redaction helpers for:
- Cookie/Authorization headers
- API keys, passwords, session IDs
- Personal information
- Sensitive query parameters

Configurable, conservative — no guarantee of complete removal

### Local Application Security
- Bind to localhost by default
- No public network exposure by default
- CSRF protection on API routes
- Input validation on all APIs
- No arbitrary file paths from model
- Restricted file ingestion
- Path traversal prevention
- File size/processing limits
- Provider credentials server-side only
- Parameterized queries (Drizzle)
- No untrusted HTML rendering
- No raw secrets in logs
- Dependency auditing + lockfile checks

### AI Tool Permissions (Allowlist Only)
- Search local research records
- Read approved evidence record
- Create draft hypothesis
- Update research note
- Draft report
- Request researcher approval

**No:** Unrestricted DB access, arbitrary code execution, network calls

---

## UI / UX Architecture

### Navigation
1. Dashboard
2. Programs
3. Assets & Features
4. Hypotheses
5. Evidence
6. Research Sessions
7. Reports
8. Settings

### Key Pages

**Dashboard:** Active programs, current session, top hypotheses, recent observations, next actions

**Program Detail (Tabs):** Overview | Scope & Rules | Assets | Features & Endpoints | Hypotheses | Evidence | Sessions | Reports

**Hypothesis Detail:** Statement, plausibility, evidence (supporting/contradicting), assumptions, expected behavior, test plan, safety constraints, outcomes, observations, priority breakdown, status history, next action

**Actions:** Edit | Request AI Analysis | Approve for Testing | Record Observation | Mark Inconclusive | Mark Disproved | Draft Report

### Visual Design
- Clean, professional dark/light theme
- Clear typography, dense but readable
- Consistent status labels
- Good empty states
- Loading/error handling
- Search + filters
- Keyboard accessible
- Responsive layouts
- Usability > animations

---

## Implementation Milestones

| Milestone | Focus | Key Deliverables |
|-----------|-------|------------------|
| **1** | Project Foundation | Next.js + TS + Drizzle + SQLite + Migrations + Zod + Program CRUD |
| **2** | Scope & Evidence | Scope records, exclusions, policy notes, Evidence CRUD, FTS search, Program evaluation |
| **3** | Feature & Endpoint Mapping | Feature inventory, endpoints, roles, CSV/JSON import, HTTP request notes |
| **4** | AI Provider & Hypothesis Engine | Provider adapter, structured validation, hypothesis generation, evidence retrieval, priority calc, AI run history, approval gates |
| **5** | Research Sessions | Session creation, observation recording, state transitions, handoff summaries, next actions |
| **6** | Report Builder | Draft generation, evidence refs, reproduction steps, impact/remediation, Markdown export, human review |
| **7** | Reliability & Security | Input validation, secret redaction, localhost defaults, error handling, DB backup, automated tests, dependency checks |
| **8** | Optional Research Automation | Advisory feeds, scheduled refreshes, duplicate detection, policy change monitoring, advanced retrieval |

---

## Testing Strategy

| Layer | Focus |
|-------|-------|
| **Unit** | Program scoring, scope classification, priority calculation, evidence ID validation, status transitions, redaction, input validation, report generation |
| **Integration** | Database CRUD, migrations, AI adapter errors, invalid structured output, missing/contradictory evidence, import validation, session persistence, report export |
| **Security** | Model cannot access files/commands/network, external docs cannot override tools, out-of-scope assets blocked, untrusted HTML not rendered, secrets not in logs, cross-program data isolation |

---

## Cost & Performance Rules

- No AI calls for deterministic operations
- Cache reusable summaries/advisory analysis
- Hash-based change detection
- Retrieve only relevant evidence
- Bounded prompts
- No repeated full-history sends
- User-configurable model selection
- AI usage metadata stored
- Configurable size/output limits
- Graceful rate limit handling
- AI features optional (app works without API key)

---

## What NOT to Build (v1)

- Autonomous exploitation / hacking agent
- Distributed scanning
- Automatic account creation on targets
- Automatic report submission
- Multi-agent orchestration framework
- Vector database (without demonstrated need)
- Graph database
- Kubernetes deployment
- Public multi-user SaaS
- Vulnerability marketplace
- Custom ML model
- Browser extension
- Vanity dashboards

---

## First Release Success Criteria

The MVP is complete when a researcher can:

1. ✅ Create an Intigriti program record
2. ✅ Record actual scope and rules
3. ✅ Add application features and endpoints
4. ✅ Import documentation and sanitized observations
5. ✅ Ask AI to generate evidence-based hypotheses
6. ✅ Inspect evidence and assumptions per hypothesis
7. ✅ Choose one hypothesis and record approved test plan
8. ✅ Perform permitted test manually
9. ✅ Record result and have AI analyze it
10. ✅ Preserve investigation across sessions
11. ✅ Draft report from verified evidence
12. ✅ Export report as Markdown

---

## Directory Structure (Planned)

```
ai-search-assistant/
├── .env.example
├── .env.local              # (gitignored)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
├── README.md
├── Architecture.md
├── Tasks.md
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Route groups
│   │   ├── (dashboard)/
│   │   ├── api/                # API Routes
│   │   │   ├── programs/
│   │   │   ├── evidence/
│   │   │   ├── hypotheses/
│   │   │   ├── sessions/
│   │   │   ├── reports/
│   │   │   └── ai/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── programs/
│   │   ├── evidence/
│   │   ├── hypotheses/
│   │   ├── sessions/
│   │   ├── reports/
│   │   └── layout/
│   ├── lib/
│   │   ├── db/                 # Drizzle setup
│   │   │   ├── index.ts
│   │   │   ├── schema/
│   │   │   └── migrations/
│   │   ├── ai/
│   │   │   ├── adapter.ts      # Provider interface
│   │   │   ├── providers/      # Concrete implementations
│   │   │   ├── prompts/        # Prompt templates
│   │   │   └── schemas/        # Zod schemas for AI I/O
│   │   ├── services/           # Application services
│   │   │   ├── program.ts
│   │   │   ├── scope.ts
│   │   │   ├── evidence.ts
│   │   │   ├── hypothesis.ts
│   │   │   ├── session.ts
│   │   │   ├── report.ts
│   │   │   └── approval-gate.ts
│   │   ├── validation/         # Zod schemas for API/forms
│   │   ├── utils/
│   │   └── constants/
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # Shared TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
└── scripts/
    ├── seed.ts
    └── dev-setup.sh
```

---

## Configuration

### Environment Variables (`.env.example`)
```bash
# AI Provider
AI_PROVIDER=openai              # or anthropic, etc.
AI_API_KEY=                     # Server-side only
AI_MODEL=gpt-4o-mini            # Configurable
AI_MAX_TOKENS=4096

# Database
DATABASE_URL=file:./dev.db      # SQLite file path

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Architectural Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| 001 | SQLite for local MVP storage | Accepted |
| 002 | Drizzle ORM over Prisma | Accepted |
| 003 | Provider-independent AI adapter | Accepted |
| 004 | No autonomous network testing in MVP | Accepted |
| 005 | Server-side only API keys | Accepted |
| 006 | Structured AI outputs with Zod validation | Accepted |
| 007 | Evidence/hypothesis separation | Accepted |
| 008 | Human approval gate for active testing | Accepted |
| 009 | FTS5 for document search (no vector DB yet) | Accepted |
| 010 | Next.js App Router + Server Actions | Accepted |

---

## Future Considerations

- Vector embeddings for semantic search (if FTS5 proves insufficient)
- Background job queue for scheduled advisory refreshes
- Git-based research history versioning
- Collaborative multi-researcher workspaces (post-MVP)
- Browser extension for evidence capture
- Integration with bug bounty platform APIs