# 

Build an AI-assisted research workspace that helps me investigate authorized bug bounty programs systematically.

The application should help me answer these questions:

1. Which bounty program should I investigate first?
2. What is in scope, and what testing is permitted?
3. What does the application do, and how is it structured?
4. What security boundaries and interesting features does it contain?
5. Which vulnerabilities are plausible based on actual evidence?
6. Which hypothesis should I investigate next?
7. What do my observations prove, and what remains uncertain?
8. How can I turn a verified finding into a high-quality report?

The application is a research assistant, not an autonomous exploitation platform.

It should prioritize evidence, maintain persistent research state, and make every recommendation traceable to its supporting information.

## Core product principles

- Evidence before speculation.
- One hypothesis at a time.
- Every hypothesis must be testable.
- Every test must have an expected outcome.
- Unknown facts must remain unknown.
- Research history must persist across sessions.
- AI recommendations must be reviewable.
- Human approval is required for active testing.
- Program scope and rules take precedence over AI suggestions.
- No vulnerability is marked confirmed merely because an AI model says it is.

---

# 2. DEFAULT TECHNOLOGY STACK

# Project Specification: Bug Bounty AI Research Assistant

Use technologies that are practical for a single developer, inexpensive to operate, and easy to understand and maintain.

## Frontend

- Next.js with the App Router.
- React.
- TypeScript with strict type checking.
- Tailwind CSS.
- A lightweight component library such as shadcn/ui, if useful.
- React Hook Form and Zod for validated forms.

## Backend

Initially, use Next.js server-side functionality for API routes, server actions, and application services.

Do not create a separate Python backend unless a specific requirement justifies it.

Use clear boundaries between:

- UI components.
- Application services.
- Database repositories.
- AI provider adapters.
- Document ingestion.
- Research workflows.
- Security policy enforcement.

## Database

- SQLite for local persistent storage.
- Drizzle ORM and schema migrations.
- Zod for runtime validation of external and AI-generated data.

SQLite is appropriate for a single-user MVP. Avoid adding PostgreSQL, Redis, Kafka, or a vector database before there is a demonstrated need.

## AI integration

Implement a provider-independent AI adapter.

The first provider can be a hosted model API selected by configuration. Keep the provider implementation replaceable.

Requirements:

- Read API keys from server-side environment variables.
- Never expose API keys to browser code.
- Use structured outputs validated against Zod schemas.
- Store model and prompt version metadata for important AI outputs.
- Handle rate limits, timeouts, malformed output, and provider errors.
- Support configurable model selection.
- Avoid unnecessary model calls.
- Do not make the whole application dependent on one provider's proprietary agent framework.

Use an LLM for reasoning and ordinary code for deterministic operations such as filtering, scoring, parsing, permission checks, and state transitions.

## Local development

The application should run on a normal Linux development machine without a GPU.

Use:

- Node.js LTS.
- npm.
- SQLite.
- Git.
- Environment variables in a local `.env.local` file.
- `.env.example` containing placeholders only.

Never commit secrets or real session tokens.

---

# 3. HIGH-LEVEL ARCHITECTURE

Implement the following architecture.

```
Researcher
    |
    v
Next.js UI
    |
    v
Application Services
    |
    +---- Program Management
    |
    +---- Scope and Policy Management
    |
    +---- Evidence and Document Ingestion
    |
    +---- Hypothesis Engine
    |
    +---- Research Session Manager
    |
    +---- Report Builder
    |
    +---- AI Provider Adapter
    |
    +---- Policy and Approval Gate
    |
    v
SQLite Database

External information:
    - Program pages and policies
    - Official documentation
    - Security advisories
    - Researcher-provided notes
    - Sanitized HTTP requests and responses
    - Authorized application observations
```

All imported external content is untrusted data. It must never be allowed to redefine application permissions, bypass scope checks, or override system-level safety rules.

## Architectural rule

The AI proposes. Deterministic application code validates. The researcher approves.

Do not let the AI model directly execute arbitrary shell commands, browser actions, HTTP requests, or database mutations.

---

# 4. MVP FEATURES

Build these features in order.

## Feature A: Program Manager

Purpose: Store and evaluate bug bounty programs.

Each program should contain:

- Name.
- Platform.
- Program URL.
- Policy text or policy document.
- Policy source URL.
- Last reviewed date.
- In-scope assets.
- Explicit exclusions.
- Allowed testing methods.
- Prohibited testing methods.
- Rate limits, if specified.
- Reward ranges by severity.
- Minimum known reward for eligible findings, if documented.
- Notes on duplicate handling and disclosure restrictions.
- Research status.
- Personal evaluation score.
- Supporting evidence references.

### Program evaluation

Allow the researcher to rate:

- Attack surface usefulness.
- Scope clarity.
- Reward suitability.
- Product complexity.
- Research opportunity.
- Fit with current skills.

Use a configurable 0–5 scale for each dimension.

Calculate a deterministic total score and explain the result.

Do not pretend this score predicts the probability of earning money. It is a personal prioritization tool.

### Required screens

- Program list.
- Program detail.
- Program creation and editing.
- Scope and rules view.
- Program comparison.
- Research status.

### Research statuses

- Inbox.
- Evaluating.
- Ready to investigate.
- Active research.
- Paused.
- Archived.

Do not automatically import or test every program found online.

---

## Feature B: Evidence Notebook

Purpose: Preserve facts and observations.

Every important research claim should have an evidence record.

An evidence record contains:

- Title.
- Evidence type.
- Content or summary.
- Source URL, if applicable.
- Source document reference, if applicable.
- Collection date.
- Relevant program.
- Relevant asset or feature.
- Relevant hypothesis.
- Confidence or verification status.
- Notes.
- Content hash, where useful for detecting changes.

### Evidence types

- Program policy.
- Official documentation.
- Security advisory.
- Release note.
- Technology observation.
- Endpoint observation.
- HTTP request.
- HTTP response.
- Manual test result.
- Screenshot or attachment reference.
- Researcher conclusion.

### Important distinction

Store facts separately from interpretations.

Example:

**Observed fact:** The application returns a JSON object when an authenticated test account requests a project.

**Interpretation:** The endpoint might have an authorization weakness.

The observation can be recorded as evidence. The interpretation belongs to a hypothesis.

Do not merge these into one unqualified statement.

---

## Feature C: Application and Attack-Surface Map

Purpose: Understand the application before investigating vulnerabilities.

Allow the researcher to create a map of:

- Assets.
- Features.
- Endpoints.
- HTTP methods.
- Parameters.
- User roles.
- Resource ownership.
- Organizations or tenants.
- Authentication requirements.
- Expected authorization rules.
- Related evidence.
- Tested and untested features.

### Endpoint record

Each endpoint should support:

- Asset.
- HTTP method.
- Path template.
- Feature name.
- Purpose.
- Authentication requirement.
- Required role.
- Resource type.
- Resource owner.
- Data sensitivity.
- State-changing behavior.
- Source of discovery.
- Notes.
- Scope status.
- Testing status.

Do not treat an endpoint as in scope simply because it was discovered through another in-scope endpoint.

### Endpoint sources

Initially accept:

- Manual entry.
- CSV import.
- JSON import.
- Sanitized HTTP request/response imports.
- Researcher-provided API documentation.

Do not build a crawler or automated production scanner into the MVP.

### Feature relationship map

For the MVP, a table and filters are sufficient.

Later, add a graph view connecting:

Asset → Feature → Endpoint → Resource → Role → Hypothesis → Evidence.

Do not spend early development time building an elaborate graph visualization.

---

## Feature D: Hypothesis Engine

This is the core AI feature.

Purpose: Generate, prioritize, investigate, and track evidence-based vulnerability hypotheses.

### Hypothesis data model

Each hypothesis should contain:

- Unique ID.
- Program ID.
- Relevant asset.
- Feature.
- Vulnerability category.
- Hypothesis statement.
- Supporting evidence IDs.
- Contradicting evidence IDs.
- Assumptions.
- Preconditions.
- Expected secure behavior.
- Potential failure mechanism.
- Proposed safe test.
- Expected result if vulnerable.
- Expected result if not vulnerable.
- Potential impact.
- Testing prerequisites.
- Scope and policy constraints.
- Estimated investigation effort.
- Priority score.
- Status.
- Researcher notes.
- Creation and update timestamps.

### Hypothesis status lifecycle

- Draft.
- Needs evidence.
- Ready for review.
- Approved for testing.
- Testing in progress.
- Supported by evidence.
- Disproved by a specific test.
- Inconclusive.
- Confirmed finding.
- Rejected.
- Archived.

Only the researcher can approve a hypothesis for active testing.

The AI may recommend a status transition, but it must not mark a vulnerability confirmed without sufficient supporting evidence and researcher approval.

### AI hypothesis-generation process

For each feature:

1. Retrieve the relevant program policy and scope.
2. Retrieve related features, endpoints, roles, and resources.
3. Retrieve supporting and contradicting evidence.
4. Identify security properties that should hold.
5. Identify plausible ways those properties could fail.
6. Generate a small number of distinct hypotheses.
7. State why each hypothesis is plausible.
8. Identify the missing evidence and prerequisites.
9. Suggest a minimal safe test.
10. Identify what would confirm, disprove, or leave the hypothesis inconclusive.
11. Estimate investigation cost and potential impact.
12. Return structured output validated by the application.

Limit each generation request to at most five hypotheses by default.

Avoid generating many slightly different versions of the same hypothesis.

### Example

Feature: Organization project management.

Observed facts:

- Users belong to organizations.
- Projects belong to organizations.
- An authenticated request can retrieve project details.
- The intended policy states that users must not access projects belonging to organizations they cannot access.

Hypothesis:

"The API might check authentication but fail to enforce project-level organization membership."

Supporting evidence:

- Project retrieval endpoint exists.
- Organization membership is a documented access boundary.

Missing evidence:

- Whether server-side authorization is enforced.
- Whether the endpoint accepts a project identifier independently of the authenticated user's permissions.

Safe test:

- Use two accounts and projects controlled by the researcher.
- Compare each account's authorized access with cross-account access.
- Stop if the server returns data outside the permitted test setup or if further validation would risk exposing real user data.

This is a hypothesis until the result demonstrates a genuine access-control failure.

---

## Feature E: Hypothesis Prioritization

Do not rely exclusively on an LLM's subjective judgment.

Use a transparent scoring model.

Initial configurable dimensions:

- Evidence strength: 0–5.
- Potential impact: 0–5.
- Relevance to the application's actual functionality: 0–5.
- Expected information gain: 0–5.
- Investigation cost: 1–5.
- Testing risk: 0–5.

Example starting formula:

```
Priority =
    3 * Evidence Strength
    + 3 * Potential Impact
    + 2 * Feature Relevance
    + 2 * Information Gain
    - 2 * Investigation Cost
    - 4 * Testing Risk
```

This formula is an initial heuristic, not a validated predictive model.

Keep every component visible in the UI. Allow the researcher to change weights in settings.

The deterministic application calculates the score. The AI explains the score and may recommend different ratings with supporting reasons.

Testing risk should never be offset by a high priority score: prohibited or unauthorized tests remain blocked regardless of the score.

---

## Feature F: Technical Research and Advisory Analysis

Purpose: Help investigate technologies and known vulnerabilities.

Accept:

- Technology names.
- Package names.
- Package versions.
- Security advisory IDs.
- Public advisory URLs.
- Release notes.
- Relevant source-code excerpts.
- Researcher observations about the stack.

### AI research workflow

1. Identify what is known about the technology.
2. Identify the source of the information.
3. Search or retrieve official documentation and public security advisories.
4. Extract affected versions.
5. Extract fixed versions.
6. Extract prerequisites.
7. Identify vulnerable functionality.
8. Compare these conditions with the evidence about the target.
9. Produce a hypothesis only when there is a plausible connection.
10. Explain what still needs verification.

### Sources to support

- GitHub Advisory Database.
- Official vendor security advisories.
- Official framework documentation.
- Official release notes and changelogs.
- Public CVE records.
- NVD records where applicable.

Store source URLs, retrieval dates, and relevant excerpts.

### Important limitations

- A frontend framework name does not prove that the backend uses the same technology.
- A server banner does not prove that a particular package is installed.
- A version string does not prove that a deployment is vulnerable.
- A known CVE does not establish that its prerequisites are met.
- A package may be patched or backported.
- A vulnerable feature may not be enabled or exposed.

Represent these uncertainties explicitly.

For the MVP, advisory matching should be research-only. Do not automatically probe live targets to verify CVEs.

---

## Feature G: Research Session Manager

Purpose: Preserve context across multiple sessions.

A research session contains:

- Program.
- Objective.
- Selected hypothesis.
- Starting context.
- Evidence reviewed.
- Actions taken.
- Test observations.
- Decisions.
- Unresolved questions.
- Next steps.
- AI model and prompt versions, where relevant.
- Start and end timestamps.

At the end of a session, the application should generate a handoff summary containing:

1. Verified facts added.
2. New assumptions.
3. Hypotheses updated.
4. Tests performed.
5. Findings that remain unconfirmed.
6. Missing evidence.
7. Next recommended actions.
8. Relevant source references.

Persist the summary so the next session does not need to rediscover the same context.

---

## Feature H: Report Builder

Purpose: Produce clear, reproducible vulnerability reports.

Report sections:

- Title.
- Summary.
- Affected asset and endpoint.
- Preconditions.
- Steps to reproduce.
- Expected behavior.
- Actual behavior.
- Evidence.
- Demonstrated impact.
- Suggested remediation.
- Relevant scope and policy references.

The AI may draft the report from a confirmed finding, but the researcher must review it before export or submission.

Never invent reproduction steps, request/response data, impact, or affected assets.

Support Markdown export in the MVP.

---

# 5. DATABASE DESIGN

Use SQLite with migrations.

Recommended initial tables:

## programs

- id
- name
- platform
- program_url
- policy_text
- policy_reviewed_at
- research_status
- evaluation_scores_json
- notes
- created_at
- updated_at

## assets

- id
- program_id
- asset_identifier
- asset_type
- scope_status
- restrictions_json
- evidence_id
- notes

## features

- id
- program_id
- asset_id
- name
- description
- roles_json
- resource_types_json
- expected_security_properties_json
- notes

## endpoints

- id
- program_id
- asset_id
- feature_id
- method
- path_template
- purpose
- authentication_requirement
- expected_authorization
- source_evidence_id
- test_status
- notes

## evidence

- id
- program_id
- evidence_type
- title
- content
- source_url
- collected_at
- verification_status
- content_hash
- metadata_json

## hypotheses

- id
- program_id
- feature_id
- title
- statement
- category
- supporting_evidence_json
- contradicting_evidence_json
- assumptions_json
- prerequisites_json
- test_plan
- expected_vulnerable_result
- expected_safe_result
- potential_impact
- status
- priority_score
- priority_breakdown_json
- created_at
- updated_at

## research_sessions

- id
- program_id
- hypothesis_id
- objective
- session_notes
- handoff_summary
- next_steps_json
- started_at
- ended_at

## test_observations

- id
- session_id
- hypothesis_id
- test_description
- expected_result
- actual_result
- evidence_ids_json
- conclusion
- created_at

## reports

- id
- program_id
- hypothesis_id
- title
- summary
- reproduction_steps_json
- expected_behavior
- actual_behavior
- demonstrated_impact
- remediation
- report_status
- created_at
- updated_at

## ai_runs

- id
- task_type
- provider
- model
- prompt_version
- input_reference_ids_json
- output_json
- validation_status
- created_at

Use foreign keys, indexes, and appropriate deletion rules.

Prefer normalized relational records for important entities. JSON columns are acceptable for flexible metadata, but do not place the entire application state in one large JSON document.

Do not store live credentials, session cookies, or API tokens in ordinary research records.

---

# 6. AI SERVICE DESIGN

Create a dedicated AI service layer.

Suggested interface:

```
interface ResearchAI {
  evaluateProgram(input): Promise<ProgramEvaluation>;

  analyzeFeature(input): Promise<FeatureAnalysis>;

  generateHypotheses(input): Promise<Hypothesis[]>;

  analyzeObservation(input): Promise<ObservationAnalysis>;

  researchAdvisory(input): Promise<AdvisoryAnalysis>;

  generateSessionSummary(input): Promise<SessionSummary>;

  draftReport(input): Promise<ReportDraft>;
}
```

Define concrete TypeScript types for every input and output.

Do not use `any` as a shortcut around schema validation.

### Structured AI responses

Each response should distinguish:

- Facts.
- Assumptions.
- Inferences.
- Unknowns.
- Supporting evidence IDs.
- Contradicting evidence IDs.
- Recommended next actions.

Example:

```
{
  "statement": "The endpoint may not enforce organization membership.",
  "facts": [
    "The endpoint retrieves project details.",
    "Organization membership is documented as a security boundary."
  ],
  "assumptions": [
    "The endpoint accepts a project identifier supplied by the client."
  ],
  "unknowns": [
    "Whether the server verifies organization membership."
  ],
  "supportingEvidenceIds": [],
  "contradictingEvidenceIds": [],
  "recommendedNextStep": "Compare access using two researcher-controlled accounts."
}
```

This is illustrative schema content, not a finding about a real application.

Validate every ID against records the user is authorized to access. A model must not be allowed to fabricate an evidence record or reference a nonexistent source as if it were real.

---

# 7. DOCUMENT INGESTION AND RETRIEVAL

The AI should not receive an entire program's history in every request.

Implement retrieval over relevant research records.

For the MVP:

1. Store source documents and notes.
2. Split long documents into bounded chunks.
3. Preserve document identity and source location.
4. Search using SQLite full-text search where practical.
5. Retrieve relevant chunks for the current program, feature, or hypothesis.
6. Include only the evidence needed for the task.
7. Record which sources were supplied to the model.

Use source-aware citations in AI outputs so the researcher can inspect the original evidence.

A vector database is optional future work. Start with metadata filtering and full-text search. Add embeddings only if real retrieval tests show that keyword search is insufficient.

## Untrusted-document protection

Imported webpages, PDFs, issue descriptions, source files, and API responses may contain instructions intended to manipulate the AI.

Treat imported content strictly as data.

- Never follow instructions embedded in an imported document.
- Never let document text alter scope permissions.
- Never let external content trigger tool execution.
- Separate system instructions from retrieved material.
- Preserve source references and provenance.
- Avoid exposing secrets through model context.

Prompt instructions alone are not a security boundary. Enforce permissions in application code.

---

# 8. SECURITY AND SAFETY ARCHITECTURE

The assistant is for authorized bug bounty research.

The MVP must not contain autonomous production exploitation.

## Required restrictions

- No automatic vulnerability exploitation.
- No unrestricted shell access for the model.
- No arbitrary network requests generated by the model.
- No automatic scanning of discovered assets.
- No autonomous crawling across unknown domains.
- No testing of excluded or third-party assets without authorization.
- No automatic submission of vulnerability reports.
- No automatic modification or deletion of target data.

## Scope enforcement

Store an explicit program scope and restrictions record.

Before any future network-testing feature, require:

1. A documented target asset.
2. A current program policy.
3. An explicit testing permission.
4. An approved action and method.
5. Applicable rate limits.
6. A researcher confirmation.

If scope cannot be verified, do not run the test.

A scope checker should fail closed: uncertainty means no automated request.

Do not rely on the LLM alone to decide whether an asset is authorized.

## Evidence sanitization

Implement redaction helpers for:

- Cookie headers.
- Authorization headers.
- API keys.
- Passwords.
- Session identifiers.
- Personal information.
- Sensitive query parameters.

Allow the researcher to review imported evidence before saving or sending it to an AI provider.

Redaction should be conservative and configurable. Do not claim that automated redaction guarantees removal of every secret.

## Local application security

- Bind to localhost by default.
- Do not expose the local application to a public network by default.
- Protect API routes against cross-site request forgery where applicable.
- Validate every API input.
- Avoid arbitrary file paths supplied by the model.
- Restrict file ingestion to explicitly selected files.
- Prevent path traversal in uploads and downloads.
- Set file size and processing limits.
- Keep provider credentials server-side.
- Use parameterized database queries.
- Avoid rendering untrusted HTML.
- Avoid storing raw secrets in logs.
- Add dependency auditing and lockfile checks.

## AI tool permissions

Use an allowlist of typed operations.

For example:

- Search local research records.
- Read an approved evidence record.
- Create a draft hypothesis.
- Update a research note.
- Draft a report.
- Request researcher approval.

Do not expose unrestricted database access or arbitrary code execution to the model.

Every write operation must validate its arguments and enforce application-level permissions.

---

# 9. UI AND USER EXPERIENCE

The interface should be simple and optimized for focused research.

## Main navigation

1. Dashboard.
2. Programs.
3. Assets and Features.
4. Hypotheses.
5. Evidence.
6. Research Sessions.
7. Reports.
8. Settings.

## Dashboard

Show:

- Active programs.
- Current research session.
- Highest-priority untested hypotheses.
- Hypotheses awaiting evidence.
- Recent observations.
- Reports awaiting review.
- Next actions.

Avoid decorative charts without a practical purpose.

## Program detail page

Tabs:

- Overview.
- Scope and Rules.
- Assets.
- Features and Endpoints.
- Hypotheses.
- Evidence.
- Sessions.
- Reports.

## Hypothesis detail page

Display:

- Statement.
- Why it is plausible.
- Supporting and contradicting evidence.
- Assumptions.
- Expected behavior.
- Test plan.
- Safety and scope constraints.
- Expected outcomes.
- Observations.
- Priority breakdown.
- Status history.
- Next action.

Provide explicit buttons for:

- Edit.
- Request AI analysis.
- Approve for testing.
- Record observation.
- Mark inconclusive.
- Mark disproved.
- Draft report.

Do not let AI generation silently change the status of a confirmed finding.

## Visual design

Use a clean, professional dark-or-light theme with:

- Clear typography.
- Dense but readable information.
- Consistent status labels.
- Good empty states.
- Loading and error handling.
- Search and filters.
- Keyboard-accessible controls.
- Responsive layouts.

Prioritize usability over elaborate animations or visual effects.

---

# 10. IMPLEMENTATION PLAN

Build in small, working increments.

Do not attempt to implement the entire system in one enormous code-generation step.

## Milestone 1: Project foundation

Implement:

- Next.js and TypeScript setup.
- Strict type checking.
- SQLite and Drizzle.
- Database migrations.
- Zod schemas.
- Application layout.
- Program CRUD.
- Basic error handling.
- Environment configuration.

Acceptance criteria:

- The app starts locally using documented commands.
- A program can be created, edited, viewed, and deleted safely.
- Records survive a restart.
- Migrations work on a clean database.
- TypeScript and lint checks pass.

## Milestone 2: Program scope and evidence

Implement:

- Scope records.
- Exclusions.
- Policy notes.
- Evidence CRUD.
- Source references.
- Program evaluation scores.
- Basic full-text search.

Acceptance criteria:

- Scope and evidence are linked to the correct program.
- Every source retains its origin.
- The researcher can distinguish documented facts from personal notes.
- Program evaluations are reproducible and explainable.

## Milestone 3: Feature and endpoint mapping

Implement:

- Feature inventory.
- Endpoint records.
- Roles and resource ownership.
- CSV/JSON imports.
- Sanitized HTTP request/response notes.

Acceptance criteria:

- Endpoints can be linked to a feature and an in-scope asset.
- Out-of-scope assets are clearly marked.
- Imports validate their schemas and reject malformed data.
- No network scanning occurs.

## Milestone 4: AI provider and hypothesis engine

Implement:

- Provider adapter.
- Structured response validation.
- Hypothesis generation.
- Evidence retrieval.
- Priority calculation.
- AI run history.
- Human approval states.

Acceptance criteria:

- Missing evidence is explicitly identified.
- Fabricated evidence IDs are rejected.
- Hypotheses include expected outcomes and a testable question.
- Provider errors do not corrupt research records.
- No network testing is triggered by model output.

## Milestone 5: Research sessions

Implement:

- Session creation.
- Observation recording.
- Hypothesis state transitions.
- Handoff summaries.
- Next-action recommendations.

Acceptance criteria:

- A research session can be resumed.
- Previously recorded tests remain visible.
- AI summaries reference the underlying evidence.
- The system does not confuse inconclusive results with proof of security.

## Milestone 6: Report builder

Implement:

- Report drafting.
- Evidence references.
- Reproduction steps.
- Impact and remediation sections.
- Markdown export.
- Human review status.

Acceptance criteria:

- Drafts contain no invented request/response data.
- Reports reference existing evidence.
- The user can edit every section.
- Nothing is submitted automatically.

## Milestone 7: Reliability and security

Implement:

- Input validation.
- Secret redaction.
- Localhost-only defaults.
- Error handling.
- Database backup/export.
- Automated tests.
- Dependency checks.
- Security documentation.

Acceptance criteria:

- Secrets are not committed.
- Malformed AI output cannot corrupt records.
- External document instructions cannot invoke tools.
- The app refuses unapproved active testing.
- Recovery from a failed AI request preserves existing work.

## Milestone 8: Optional research automation

Only after the earlier milestones are stable, consider:

- Official advisory feeds.
- Scheduled public-source refreshes.
- Duplicate hypothesis suggestions.
- Changes in documented program policies.
- Endpoint inventory comparison.
- More advanced retrieval.
- A review queue for potential research actions.

All external information must retain its source and retrieval date.

---

# 11. TESTING STRATEGY

Create unit, integration, and UI tests.

## Unit tests

Test:

- Program scoring.
- Scope classification.
- Hypothesis priority calculation.
- Evidence ID validation.
- Status transition rules.
- Secret redaction.
- Input validation.
- Report generation from structured data.

## Integration tests

Test:

- Database CRUD.
- Migrations.
- AI adapter errors.
- Invalid structured output.
- Missing or contradictory evidence.
- Import validation.
- Research session persistence.
- Report export.

## Security tests

Verify:

- The model cannot access arbitrary files.
- The model cannot execute arbitrary commands.
- The model cannot initiate network tests.
- External document content cannot override tool permissions.
- Out-of-scope assets cannot be approved through an AI-generated claim.
- Untrusted HTML is not rendered as executable content.
- Secrets do not appear in ordinary logs.
- Imported records cannot reference another program's private data without authorization.

Use mocks and local fixtures for these tests.

---

# 12. COST AND PERFORMANCE RULES

I want this to be practical on a low budget.

- Do not call an AI model for deterministic operations.
- Cache reusable summaries and advisory analysis.
- Use hashes to detect unchanged documents.
- Retrieve only relevant evidence.
- Keep model prompts bounded.
- Avoid repeatedly sending entire program histories.
- Allow the user to choose the model.
- Store AI usage metadata where the provider makes it available.
- Set configurable limits on document size and AI output.
- Handle rate limits gracefully.
- Make AI features optional so the rest of the application remains usable without an API key.

Do not add a local GPU model requirement.

A small hosted model may be sufficient for structured summaries and hypothesis organization, while more complex reasoning can use a stronger model when needed.

---

# 13. WHAT NOT TO BUILD IN THE FIRST VERSION

Do not build these features until the core workflow works:

- Autonomous exploitation.
- A fully autonomous hacking agent.
- Distributed scanning.
- Automatic account creation on target websites.
- Automatic submission of reports.
- A complex multi-agent orchestration framework.
- A vector database without demonstrated retrieval problems.
- A graph database.
- A Kubernetes deployment.
- A public multi-user SaaS.
- A marketplace for vulnerability findings.
- A custom machine-learning model.
- A browser extension.
- A complicated dashboard with meaningless metrics.

The MVP should solve one problem exceptionally well:

**Given a program, relevant evidence, and a research objective, help the researcher develop a defensible hypothesis, investigate it systematically, preserve the evidence, and decide what to do next.**

---

# 14. REQUIRED DELIVERABLES FROM THE CODING AGENT

The coding agent must produce:

1. A working local application.
2. A clear directory structure.
3. Database schema and migrations.
4. Seed data containing fictional programs and fictional observations.
5. A `.env.example` file.
6. A complete README.
7. Setup and run instructions.
8. Unit and integration tests.
9. Documentation of the AI provider configuration.
10. Documentation of the security model.
11. A list of implemented features and known limitations.
12. A prioritized list of future improvements.

The application must not ship with fabricated real-world findings or hardcoded credentials.

Fictional seed data must be clearly labeled as demonstration data.

---

# 15. INSTRUCTIONS FOR THE CODING AGENT

Follow these development rules:

1. Inspect the existing repository before making changes.
2. If the repository is empty, initialize the stack specified in this document.
3. Write a short implementation plan before coding.
4. Implement one milestone at a time.
5. Run the relevant tests after each milestone.
6. Fix failures before moving forward.
7. Do not silently skip requirements.
8. Ask for clarification when a requirement genuinely blocks implementation.
9. Prefer the simplest architecture that satisfies the requirement.
10. Do not introduce dependencies without a clear reason.
11. Keep types, schemas, and database migrations synchronized.
12. Keep secrets out of source control.
13. Never implement autonomous production testing as an unrequested shortcut.
14. Document architectural decisions and trade-offs.
15. At the end of each milestone, report what works, what was tested, and what remains incomplete.

When the requirements conflict, prioritize security, data integrity, scope enforcement, and the MVP objectives.

Do not merely produce a mockup or static dashboard. The core records, database operations, AI integration, validation, and research workflow must work.

Start with Milestone 1. Do not implement all milestones at once.

---

# 16. MY FIRST SUCCESS CRITERIA

The first usable release is complete when I can:

1. Create an Intigriti program record.
2. Record its actual scope and rules.
3. Add application features and endpoints.
4. Import relevant documentation and sanitized observations.
5. Ask the AI to generate evidence-based hypotheses.
6. Inspect the evidence and assumptions supporting each hypothesis.
7. Choose one hypothesis and record an approved test plan.
8. Perform a permitted test myself.
9. Record the result and have the AI analyze it.
10. Preserve the investigation across sessions.
11. Draft a report from verified evidence.
12. Export the report as Markdown.

This is the first release target. Everything else is optional until this workflow is reliable.

---

# 17. FIRST TASK TO GIVE THE CODING AGENT

Read this specification and inspect the repository.

Then:

1. Propose a concise architecture and implementation plan.
2. Identify any genuine ambiguities.
3. Initialize the project using the specified stack.
4. Implement Milestone 1 only.
5. Run tests, type checking, and linting.
6. Provide exact commands to start the app locally.
7. Explain the directory structure and how the datab