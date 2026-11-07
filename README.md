# BB Research — User Guide

**Bug Bounty AI Research Assistant** is a local-first workspace for investigating
authorized bug bounty programs in a structured, evidence-driven way. It stores
programs, scope rules, evidence, application maps, hypotheses, research sessions
and report drafts in a local SQLite database. An external LLM is optional and is
used only for reasoning tasks.

> **Golden rule:** the AI proposes, deterministic application code validates, and
> the researcher approves. The AI cannot run commands, make network requests, or
> change records by itself.

This guide covers:

1. [Requirements](#1-requirements)
2. [Launch the app](#2-launch-the-app)
3. [Connect an external LLM with an API key](#3-connect-an-external-llm-with-an-api-key)
4. [Work with the app](#4-work-with-the-app)
5. [Backups and database maintenance](#5-backups-and-database-maintenance)
6. [Commands reference](#6-commands-reference)
7. [Troubleshooting](#7-troubleshooting)
8. [Current build limitations](#8-current-build-limitations)

---

## 1. Requirements

| Requirement | Details |
|---|---|
| **Node.js 22 LTS** | Recommended. `package.json` uses Next.js 16; tests require Node 22. |
| **npm** | Ships with Node. `npm ci` / `npm install` is used here. |
| **Git** | Only needed to clone the repository. |
| **Disk** | A few hundred MB for dependencies, plus the SQLite file. |
| **GPU** | Not required. AI calls go to a hosted or local API. |
| **OS** | Linux, macOS, or Windows with WSL2. |

Check your Node version:

```bash
node -v
# v22.x.x
```

If you use `nvm`:

```bash
nvm install 22
nvm use 22
```

---

## 2. Launch the app

All commands below are run from the project root (the folder containing
`package.json`).

### 2.1 First-time setup

```bash
# 1. Get the project (skip if you already have it)
git clone <your-repository-url> ai-search-assistant
cd ai-search-assistant

# 2. Use Node 22
nvm use 22

# 3. Install dependencies
npm install

# 4. Create your local environment file
cp .env.example .env.local

# 5. Edit .env.local and add your LLM settings (see section 3)
${EDITOR:-nano} .env.local

# 6. Create/upgrade the SQLite schema
npm run db:migrate

# 7. Optional: load fictional demonstration data
npm run db:seed

# 8. Start the development server
npm run dev
```

Open **<http://127.0.0.1:3000>**.

> **`db:seed` erases existing research data.** It clears every table before
> inserting the fictional demo programs. Run it only on a fresh database or when
> you are happy to lose the current contents.

### 2.2 What a successful launch looks like

The terminal should show something like:

```text
▲ Next.js 16.4.2 (Turbopack)
- Local:   http://127.0.0.1:3000
✓ Ready
```

The browser should show the **Dashboard**. With seed data you will see demo
programs such as `ExampleCorp Bug Bounty` and `FinTech Solutions VDP`. All seed
content is fictional and labelled `[DEMO DATA]`.

The app binds to `127.0.0.1` on purpose: it is a single-user local application,
not a public server.

### 2.3 Everyday start and stop

```bash
cd ai-search-assistant
nvm use 22
npm run dev
```

Press `Ctrl+C` in the terminal to stop it. Your data stays in `dev.db`.

### 2.4 Run in production mode

```bash
npm run build
npm start
```

`npm start` also binds to `127.0.0.1:3000`. Use production mode when you want a
faster, compiled version of the UI. There is no cloud deployment requirement;
the app is designed to run locally.

### 2.5 Use a different port

```bash
npm run dev -- -p 3001
```

Then open <http://127.0.0.1:3001>.

### 2.6 Deliberately expose it on your LAN (not recommended)

The default scripts bind to localhost. If you really need access from another
device on your network:

```bash
npx next dev -H 0.0.0.0
```

This removes the localhost-only protection. Only do this on a trusted network,
and remember that the app has no multi-user authentication.

### 2.7 First-run database setup is required

The development server does **not** create database tables for you. If you skip
`npm run db:migrate`, pages can fail with errors such as:

```text
SqliteError: no such column: "updated_at"
```

Run the migration again; it is idempotent and safe to repeat:

```bash
npm run db:migrate
```

---

## 3. Connect an external LLM with an API key

### 3.1 How the connection works

- LLM calls are made **server-side only** by the adapter in `src/lib/ai/`.
- The browser never receives your API key.
- Configuration is read from **environment variables**, normally `.env.local`.
- `.env.local` is git-ignored and must never be committed.
- **Restart `npm run dev` after changing any AI variable.** Environment changes
  are not picked up by an already-running Next.js process.
- AI is optional. Programs, scope, evidence, features, endpoints, hypotheses,
  sessions and reports can be used without a key; only AI actions need one.

### 3.2 Supported providers

| `AI_PROVIDER` | Use for | API key | Notes |
|---|---|---|---|
| `openai` | OpenAI hosted models | Required | Uses `/chat/completions` with JSON mode. |
| `anthropic` | Anthropic Claude models | Required | Uses the Messages API; returns JSON text. |
| `generic` | Any OpenAI-compatible API | Optional | Uses `AI_BASE_URL` + `AI_API_PATH`. |

> **This build:** set `AI_BASE_URL` explicitly for `openai` and `anthropic` too.
> The provider code does not currently fall back to the vendor URL when the
> variable is absent. Without it you will see
> `Failed to parse URL from undefined/chat/completions`.

### 3.3 Option A — OpenAI

1. Create an API key at <https://platform.openai.com/api-keys>.
2. In `.env.local`:

```bash
AI_PROVIDER=openai
AI_API_KEY=sk-...your-new-key...
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

3. Restart the dev server.

Use any chat model that supports JSON output. The default is `gpt-4o-mini`.

### 3.4 Option B — Anthropic

1. Create an API key in the Anthropic Console.
2. In `.env.local`:

```bash
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...your-new-key...
AI_MODEL=claude-3-haiku-20240307
AI_BASE_URL=https://api.anthropic.com/v1
```

3. Restart the dev server.

You can use another Claude model id that your account can access. Output tokens
are currently fixed at 4096 inside the Anthropic adapter.

### 3.5 Option C — Any OpenAI-compatible endpoint

Use the `generic` provider for OpenRouter, Groq, Together, LM Studio, Ollama, or
any server exposing `POST {base}/chat/completions`.

The endpoint must:

- accept an OpenAI-style `messages` array;
- return `choices[0].message.content`;
- return **valid JSON** (the app validates it with Zod);
- preferably support `response_format: {"type": "json_object"}`.

If your server uses a different path, set `AI_API_PATH` (default
`/chat/completions`).

#### OpenRouter

```bash
AI_PROVIDER=generic
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...your-key...
AI_MODEL=openai/gpt-4o-mini
```

#### Groq

```bash
AI_PROVIDER=generic
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_...your-key...
AI_MODEL=llama-3.3-70b-versatile
```

#### Ollama (local, no key)

```bash
AI_PROVIDER=generic
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_API_KEY=
AI_MODEL=llama3.2
```

Make sure Ollama is running (`ollama serve`) and the model is pulled
(`ollama pull llama3.2`).

#### LM Studio (local, no key)

```bash
AI_PROVIDER=generic
AI_BASE_URL=http://127.0.0.1:1234/v1
AI_API_KEY=
AI_MODEL=local-model
```

Use the model identifier shown in LM Studio's local server panel.

### 3.6 Environment variable reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AI_PROVIDER` | No | `openai` | `openai`, `anthropic`, or `generic`. |
| `AI_API_KEY` | Yes for `openai`/`anthropic` | — | Server-side provider key. Optional for `generic`. |
| `AI_MODEL` | No | Provider-specific | Chat model id. Defaults: `gpt-4o-mini`, `claude-3-haiku-20240307`, `llama3.2`. |
| `AI_BASE_URL` | Yes in this build | — | API root, **without a trailing slash**. |
| `AI_API_PATH` | No | `/chat/completions` | Request path, generic provider only. |
| `AI_MAX_TOKENS` | No | `4096` | Present in `.env.example` but **not currently applied** to requests. |
| `DATABASE_URL` | No | `file:./dev.db` | SQLite file location. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Informational base URL. |
| `NODE_ENV` | No | `development` | Set automatically by `next dev`/`next build`. |

Never put a key in a `NEXT_PUBLIC_*` variable. Those values are exposed to the
browser. The provider key must stay in `AI_API_KEY`.

### 3.7 Verify the connection

The app calls the provider when you trigger an AI action. To test the provider
configuration directly — without changing any research data — run this from the
project root:

```bash
nvm use 22
npx tsx --env-file=.env.local -e "import { createAIProvider, getProviderFromEnv } from './src/lib/ai/factory'; const { provider, config } = getProviderFromEnv(); const ai = createAIProvider(provider, config); ai.generateSessionSummary({ session: { objective: 'Connection test', notes: 'none', observations: [] } }).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error('ERROR:', e.message); process.exit(1); });"
```

A working configuration prints a JSON object containing `objective`,
`actionsTaken`, `keyFindings`, `nextSteps`, `handoffNotes`, and `confidence`.
This makes one real (small) provider call.

### 3.8 Common LLM setup errors

| Message | Likely cause | Fix |
|---|---|---|
| `AI_API_KEY environment variable is required` | No key set, or server not restarted | Add `AI_API_KEY` to `.env.local`, restart. |
| `AI_BASE_URL environment variable is required for generic provider` | `AI_PROVIDER=generic` without a base URL | Add `AI_BASE_URL`. |
| `Failed to parse URL from undefined/chat/completions` | `AI_BASE_URL` missing for OpenAI/Anthropic | Set the vendor URL explicitly. |
| `401` / `invalid_api_key` | Wrong, revoked, or placeholder key | Replace the key, restart. |
| `404 model not found` | Model id not available to your account | Check the provider's model list. |
| `429` / rate limit | Provider quota | Wait, lower request frequency, or upgrade the plan. |
| `Failed to parse/validate ... response` | Model did not return JSON matching the schema | Use a stronger model, or a provider/model with JSON mode. |
| `fetch failed` / `ECONNREFUSED` | Local server (Ollama/LM Studio) is not running | Start it and check the port. |

Provider errors are shown in the UI for most actions and in the terminal that
runs `npm run dev`.

### 3.9 Key safety

- Keep `.env.local` out of Git. It is already covered by `.gitignore`.
- Never paste a key into evidence, a hypothesis, or a report.
- If a key leaks: revoke it at the provider immediately, create a new one, update
  `.env.local`, and restart the app.
- The app stores AI metadata (provider, model, prompt version, validation status)
  in the `ai_runs` table for auditability.

---

## 4. Work with the app

### 4.1 Navigation overview

The **Programs** area is the hub. Open a program and use its tabs:

| Tab | What it is for |
|---|---|
| **Overview** | Program details, policy text, evaluation scores. |
| **Scope & Rules** | In-scope/out-of-scope assets, rate limits, allowed methods, rewards. |
| **Features** | Application features, roles, resource types, expected security properties. |
| **Endpoints** | HTTP endpoints linked to features/assets and their test status. |
| **Hypotheses** | Testable vulnerability hypotheses and their lifecycle. |
| **Evidence** | Facts, documents, HTTP observations and test results. |
| **Sessions** | Time-boxed research sessions, notes and handoff summaries. |
| **Reports** | Draft findings, editing, status workflow and Markdown export. |

> **Navigation note:** in the current build, the top-level sidebar entries for
> *Assets & Features*, *Hypotheses*, *Evidence*, *Sessions*, *Reports* and
> *Settings* are placeholders that return 404. Use the tabs inside a program.
> Only **Dashboard** and **Programs** work at the top level. See
> [Current build limitations](#8-current-build-limitations).

Recommended order for a new program:

```text
Program → Scope & Rules → Evidence → Features → Endpoints
        → Hypotheses → Sessions + Observations → Reports
```

### 4.2 Create a program

1. Open **Programs** in the sidebar.
2. Click **New Program**.
3. Fill in:
   - **Program name**.
   - **Platform** (e.g. Intigriti, HackerOne, Bugcrowd).
   - **Program URL**.
   - **Research status**: Inbox, Evaluating, Ready to Investigate, Active Research,
     Paused, Archived.
   - **Policy reviewed date**.
   - **Policy text**: paste the scope, exclusions, rules, and reward ranges.
   - **Evaluation scores**: six 0–5 sliders (attack surface usefulness, scope
     clarity, reward suitability, product complexity, research opportunity,
     skill fit). The total is shown out of 30 and is a personal prioritization
     tool, not a prediction of earnings.
   - **Notes**.
4. Click **Create Program**.

To change it later, open the program and use the pencil icon, or go to
`/programs/<id>/edit`.

### 4.3 Record scope and rules

Open the program → **Scope & Rules** → **Add Asset**.

Each asset records:

- **Identifier** (domain, API host, app, etc.).
- **Type**.
- **Scope status**: In scope, Out of scope, Unknown.
- **Rate limit**.
- **Authentication required**.
- **Allowed methods** and **prohibited methods** (comma-separated).
- **Reward range**.
- **Notes**.

The current UI implements scope as asset records. Add out-of-scope assets too,
so the distinction is explicit and auditable.

> An endpoint is not in scope merely because it was discovered through an
> in-scope endpoint. Record scope deliberately.

### 4.4 Add evidence

Open the program → **Evidence** → **Add Evidence**.

Fields:

- **Evidence type**: program policy, official documentation, security advisory,
  release note, technology observation, endpoint observation, HTTP request,
  HTTP response, manual test result, screenshot/attachment, researcher conclusion.
- **Verification status**: unverified, verified, disputed.
- **Title**.
- **Content** ("Observed Fact"). HTTP request/response content gets a redaction
  preview for `Authorization`, `Cookie`, API tokens, passwords and similar
  fields. Review it and apply redactions before saving.
- **Source URL**.
- **Collected date**.

Keep interpretations out of the evidence content. Record them as a hypothesis
instead.

Keep this distinction:

```text
Observed fact  → "The endpoint returned a JSON project object for account A."
Interpretation → "The endpoint may not enforce organization membership."
```

The fact belongs in evidence; the interpretation belongs in a hypothesis.

Redaction is conservative but not exhaustive. You remain responsible for what
you save.

### 4.5 Map features

Open the program → **Features** → **Add Feature**.

Fields:

- **Feature name** (e.g. "User Management API").
- **Asset** it belongs to.
- **Description**.
- **Roles** (comma-separated, e.g. `admin, user, guest`).
- **Resource types** (e.g. `user, organization, project`).
- **Expected security properties** (e.g. `authorization, authentication,
  rate-limiting`).
- **Notes**.

### 4.6 Map endpoints

Open the program → **Endpoints** → **Add Endpoint**.

Fields:

- HTTP method and path template (e.g. `GET /api/v1/projects/:id`).
- Linked asset and feature.
- Purpose.
- Authentication requirement.
- Expected authorization rule.
- Test status: untested, testing, tested-vulnerable, tested-secure, blocked.
- Notes.

The endpoint list supports filters by method, test status, and path search.

> CSV/JSON bulk import is implemented at
> `POST /api/programs/<programId>/endpoints/import` but has no UI button in this
> build. Use the single-endpoint form instead.

### 4.7 Create and manage hypotheses

Open the program → **Hypotheses**.

Click **New Hypothesis** and fill in:

- Title.
- Hypothesis statement.
- Category (authorization, authentication, input validation, business logic,
  information disclosure, session management, crypto, configuration, other).
- Feature.
- Potential impact.
- Supporting and contradicting evidence IDs (comma-separated).
- Assumptions and prerequisites (comma-separated).
- Test plan.
- Expected vulnerable result and expected safe result.

A hypothesis should be testable and have both expected outcomes. A hypothesis is
**not** a confirmed vulnerability.

**Status lifecycle:**

```text
draft → needs_evidence → ready_for_review → approved_for_testing
      → testing_in_progress → supported_by_evidence / disproved_by_test
      → inconclusive → confirmed_finding / rejected → archived
```

Rules enforced by the application:

- Only the researcher can approve testing.
- Testing and confirmation transitions go through the **PolicyApprovalGate**.
- A confirmed finding is terminal; it is not silently demoted.
- A hypothesis can only be confirmed with supporting evidence and researcher
  approval — never because an AI said so.

**AI generation:** *Generate from Feature* is intended to send the feature,
related endpoints, and program evidence to the configured model, validate the
structured response with Zod, reject unknown evidence IDs, and save up to a small
number of draft hypotheses. See the current build caveat in
[Current build limitations](#8-current-build-limitations) before relying on this
button.

### 4.8 Run a research session and record observations

Open the program → **Sessions** → **New Session**.

Fields:

- Objective.
- Linked hypothesis (optional but recommended).
- Session notes.
- Handoff summary.
- Next steps (comma-separated).

Open a session to see its details and timeline, then use **Record Observations**
(or the **Observations** tab).

Each observation records:

- Test description.
- Expected result.
- Actual result.
- Linked evidence IDs.
- Conclusion: supported, refuted, or inconclusive.

Observations are the bridge between a hypothesis and a conclusion. Do not record
an interpretation as if it were an observation.

### 4.9 Draft and export a report

Open the program → **Reports**.

A report can only be drafted from a hypothesis in **Confirmed Finding** status.
The AI draft:

- uses the hypothesis, its supporting evidence, and its recorded observations;
- is validated against a structured schema;
- has unresolvable `[[evidence:ID]]` citations stripped automatically;
- is saved as a **draft** for human review — nothing is submitted anywhere;
- logs an audit row in `ai_runs`.

Edit every section before export:

- Title.
- Summary.
- Affected asset and endpoint.
- Preconditions.
- Steps to reproduce (one per line).
- Expected behaviour.
- Actual behaviour.
- Demonstrated impact.
- Suggested remediation.

Use **Add evidence citation** to insert `[[evidence:ID]]` references. They are
resolved to numbered `[EVn]` references with an evidence appendix during export.

Report statuses are forward-only:

```text
draft → in_review → approved → submitted
```

Click **Export** to download the report as Markdown
(`/api/programs/<id>/reports/<reportId>/export`).

Never invent reproduction steps, request/response data, impact, or affected
assets. If the evidence does not support a statement, leave it as a `[TODO: ...]`
placeholder or remove it.

### 4.10 Dashboard

The Dashboard shows:

- Total programs and active programs.
- Total hypotheses.
- Hypotheses ready for testing.
- Active programs.
- Recent sessions.
- Recent evidence.

Use it as the daily starting point; open a program to do the actual work.

### 4.11 What the AI is allowed to do

The AI has no tools. It cannot read files, run shell commands, make network
requests, or mutate the database. It only returns structured text that the
application validates and stores. Deterministic code performs filtering, scoring,
permission checks, status transitions, and validation.

If AI is unconfigured or a call fails, research records are not corrupted;
existing work remains available.

---

## 5. Backups and database maintenance

Everything lives in the SQLite file configured by `DATABASE_URL` (default
`./dev.db`).

### 5.1 Export a JSON backup

```bash
npm run db:export
```

Creates `backups/db-export-<timestamp>.json` with every table.

Export a single table as CSV:

```bash
npm run db:export -- --csv evidence
```

### 5.2 Restore a backup

```bash
npm run db:import -- backups/db-export-<timestamp>.json
```

The import refuses to overwrite a non-empty database. To overwrite deliberately:

```bash
npm run db:import -- --force backups/db-export-<timestamp>.json
```

### 5.3 Browse the database

```bash
npm run db:studio
```

Opens Drizzle Studio, a local database browser.

### 5.4 Reset to demo data

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` clears all tables first. Export a backup before doing this if the data
matters.

### 5.5 Apply schema changes

After pulling changes that include new files in `drizzle/`:

```bash
npm run db:migrate
```

`db:migrate` is idempotent and tracks applied files by hash.

---

## 6. Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on `127.0.0.1:3000`. |
| `npm run build` | Create a production build. |
| `npm start` | Serve the production build on `127.0.0.1:3000`. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript with `--noEmit`. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes (development only). |
| `npm run db:migrate` | Apply `drizzle/*.sql` migrations to the configured database. |
| `npm run db:seed` | Replace database contents with fictional demo data. |
| `npm run db:export` | Export all tables to JSON, or one table to CSV. |
| `npm run db:import -- <file>` | Restore tables from a JSON export. |
| `npm run db:studio` | Open Drizzle Studio. |

Run the checks before sharing changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `node:util.styleText` or syntax errors when testing/building | Use Node 22: `nvm use 22`. |
| `SqliteError: no such column ...` | Run `npm run db:migrate`. |
| App starts but pages are empty | Run `npm run db:migrate`, optionally seed demo data. |
| `npm run db:seed` removed my data | Expected: seeding clears all tables. Restore from `backups/` with `db:import`. |
| Port 3000 already in use | `npm run dev -- -p 3001`. |
| LLM changes have no effect | Stop and restart the dev server. |
| `Failed to parse URL from undefined/chat/completions` | Set `AI_BASE_URL` for OpenAI/Anthropic. |
| `Failed to parse/validate ... response` | The model returned non-JSON or an unexpected shape. Try a model with JSON mode. |
| 404 on a sidebar link | Known build limitation; use the program tabs. |
| AI button returns a server error about destructuring `id` | Known routing defect in the current AI endpoints; see below. |
| `better-sqlite3` install/build failure | Install build tools (Linux: `build-essential python3`), then reinstall. |
| Database is locked | Stop other dev servers or database browsers using the same `dev.db`. |

---

## 8. Current build limitations

This repository is a work in progress. The core data model, CRUD APIs,
validation, redaction, approval gate design and report/markdown pipeline are in
place, but the following items are not fully wired in the UI yet:

1. **Top-level sidebar links** — *Assets & Features*, *Hypotheses*, *Evidence*,
   *Sessions*, *Reports* and *Settings* return 404. Use the tabs inside a program.
   There is no Settings page; AI is configured through `.env.local`.
2. **Program tab links** — the *Overview* and *Assets* tabs point at routes that
   do not exist. The program root page is the overview, and assets are managed
   under *Scope & Rules*.
3. **AI hypothesis generation and approval** — the `Generate from Feature` button
   and the `Approve for Testing` action currently fail because their
   `/api/ai/*` handlers expect a `[id]` URL segment that is not present. The
   approval gate also contains a schema-relation lookup that raises
   `Cannot read properties of undefined (reading 'referencedTable')`.
   Until this is fixed, create hypotheses manually. The AI provider connection
   itself can still be verified with the smoke test in section 3.7.
4. **AI report drafting** — reports can only be drafted from a
   `confirmed_finding` hypothesis. Because the approval/confirmation path is
   affected by item 3, AI report drafting is not reachable end-to-end in this
   build. The report editor and Markdown export work once a report record exists.
5. **Program evaluation AI** — the evaluation route exists but is not exposed as
   a button, and it uses the same missing-`id` pattern. The six manual sliders in
   the program form work.
6. **Endpoint CSV/JSON import** — available only as an API endpoint, with no UI.
7. **`AI_MAX_TOKENS`** — listed in `.env.example` but not applied to requests yet.
8. **Seed data is fictional** — it exists to demonstrate the workflow and must not
   be treated as real-world research.
9. **Some optional dropdowns** — selects that include an empty "None" option
   (for example Feature → Asset, Session → Hypothesis, and the endpoint filters)
   can throw a client-side Radix Select error when opened. In this build, avoid
   opening them; save the record without the optional link, or use the normal
   text fields instead.

When these are resolved, the intended workflow is the one described in section 4.

---

## 9. Project documentation

| File | Contents |
|---|---|
| `README.md` | This user guide. |
| `Architecture.md` | Architecture, data model, AI service design, milestones. |
| `Requirment.md` | Original product and security requirements. |
| `Tasks.md` | Implementation task breakdown. |
| `SECURITY.md` | Threat model, data handling, backup and incident response. |
| `REVIEW.md` | Report-builder review notes and resolved issues. |
| `explain.md` | Implementation notes for the milestone work. |

For source-level detail:

- `src/app/` — Next.js pages and API routes.
- `src/components/` — UI components grouped by domain.
- `src/lib/ai/` — provider adapter, factory, prompts and Zod schemas.
- `src/lib/services/` — hypothesis, report and approval-gate services.
- `src/lib/db/schema/` — Drizzle table definitions.
- `src/lib/validation/` — Zod schemas for API and form input.
- `src/lib/security/` — redaction, upload and HTTP sanitisation helpers.
- `drizzle/` — SQL migrations.
- `scripts/` — migration, seed, export and import scripts.
- `test/` — unit and integration tests.

---

**Reminder:** use this tool only on programs that explicitly authorize your
testing, and respect their scope, rules and rate limits. The application helps
you organize research; it does not grant permission to test anything.
