# ai‑search‑assistant – User Guide

*Local‑first, single‑user bug‑bounty program manager. All data lives in `dev.db` (SQLite). No cloud sync, no user accounts.*

---

## 1. About this app
- **Purpose**: Manage bug‑bounty‑style bounty programs, features, endpoints, evidence, hypotheses and reports.
- **AI**: Optional LLM backend via OpenRouter (default), OpenAI or Anthropic. All AI calls go through validated Zod schemas – the AI *recommends*, deterministic code *validates*.
- **Principles**: AI proposes, deterministic code validates, researcher approves; no autonomous actions; local‑first/single‑user.
- **Running the app**: 
  ```bash
  source ~/.nvm/nvm.sh && nvm use 22
  npm run dev
  ```
  The app is at `http://localhost:3000`.

---

## 2. Programs – creating & managing
| Step | What you do | Result |
|------|-------------|--------|
| **2.1 Create a new program** | 1. Click **New Program** (top‑right on the Programs list).<br>2. Fill the form:<br>• **Program Name** – short title.<br>• **Platform** – e.g. “HackerOne”, “Bugcrowd”.<br>• **Program URL** – link to the official program page.<br>• **Policy Text** – the program’s rules/scope (required for the approval gate).<br>• **Policy Reviewed At** – optional date‑time (leaving it blank creates the program without a review date).<br>• **Research Status** – pick from the dropdown (default “Inbox”).<br>• **Evaluation Scores** – six sliders (see §3).<br>• **Notes** – free‑form remarks. | The program is persisted to `dev.db` and appears in the programs list. |
| **2.2 Edit a program** | Open a program’s detail page (`/programs/<id>`) and click **Edit** (or modify fields directly). Changes are saved via `PATCH /api/programs/<id>`. | The program record is updated; the UI refreshes after the request succeeds. |
| **2.3 Delete a program** | On the program‑detail page there is a **Delete** button (currently inert – no `onClick` handler; the API endpoint exists at `DELETE /api/programs/<id>`). | *Planned*: add a confirmation dialog and properly remove the program and its dependent records. |
| **2.4 Filter & search** | Use the **ProgramFilters** component (top of the list) to filter by platform, status, or free‑text search. | Shows only the programs matching the criteria. |

### 2.1 Score & evaluation sliders (★)
The **Evaluation Scores** section contains six sliders, each rated **0 – 5**:

| Slider | Meaning |
|--------|---------|
| **Attack Surface Usefulness** | How promising the program’s attack surface is for finding vulnerabilities. |
| **Scope Clarity** | How well‑defined the program’s scope is. |
| **Reward Suitability** | Whether the bug‑bounty reward matches the effort required. |
| **Product Complexity** | How complex the target application is (more complexity → more potential issues). |
| **Research Opportunity** | Overall opportunity for novel research or discovery. |
| **Skill Fit** | How well the program matches your current skill set. |

**How the score is calculated**
```
total = Σ (slider_value × weight)
```
All six weights are **1** by default, so the **maximum total is 30** (5 × 6). The UI displays the total and a breakdown under the sliders.

*Important*: **The score is computed entirely in the browser** – it does **not** involve the LLM or any server‑side AI. It is a personal prioritisation tool for you, the researcher. If you create a program without moving any sliders, the total will be **0.0 / 30** – that is perfectly valid; you can adjust the sliders later.

**How to change the scores**
1. Drag each slider left or right, or type a number directly into the small text field beneath it.
2. The **total** and **breakdown** update instantly.
3. When you submit the form, the selected scores are saved in the `evaluationScoresJson` column of the program record.

---

## 3. Features, endpoints & evidence
| Entity | What it is | Typical use |
|--------|------------|-------------|
| **Feature** | A high‑level grouping (e.g., “Authentication”, “File Upload”). Features are linked to a program and can have an associated **asset**. | Organise related endpoints and hypotheses. |
| **Endpoint** | A specific URL / API surface within the program’s scope (e.g., `POST /login`). May have authentication requirements, method, and optional evidence. | Document exactly what you will test. |
| **Evidence** | Upload HTTP request/response files (`.har`, `.json`, `.txt`, images, screenshots). The app automatically redacts secrets, computes a `contentHash`, and stores it for deduplication. | Provide proof‑of‑concept material for hypotheses and reports. |
| **Scope** | A many‑to‑many link between a program and an asset (domain/endpoint). Helps keep the program’s testing scope delimited. | Ensure you only test in‑scope assets. |

**Creating / editing**
- **Feature**: In the Programs detail page, use the **Features** tab. Add a name, description, and optional asset.
- **Endpoint**: Within a Feature, add an endpoint method, path, auth type, and optional notes.
- **Evidence**: From the Evidence tab (or the program’s sidebar), upload a file. The UI will show a preview, the redacted content, and the generated hash.

All three entities are **program‑scoped** – the app enforces that you cannot mix assets from different programs.

---

## 4. Hypotheses & the approval gate
### 4.1 Generating a hypothesis
1. Open a **Feature** page.
2. Click **Generate Hypotheses** (AI‑driven).
3. The app sends the feature description plus any linked evidence to the configured LLM (OpenRouter by default).
4. The LLM returns a list of hypothesised vulnerabilities, each with a statement, test plan, supporting/contradicting evidence IDs, and a **priorityScore** (the AI’s own score, *not* the slider score).
5. The hypotheses appear in the **Hypotheses** list for the program.

*If the AI route is mis‑configured (e.g., missing `AI_BASE_URL`), you’ll see a 400 error – check the env vars.*

### 4.2 Hypothesis lifecycle (status transitions)
| Status | When you can move to it | How |
|--------|------------------------|-----|
| **draft** | Initially created. | AI generation puts the hypothesis here. |
| **needs_evidence** | From draft. | Use the UI “Mark Needs Evidence” button. |
| **ready_for_review** | From needs_evidence. | Indicates you think the hypothesis is ready for gate. |
| **approved_for_testing** | **Only** via the **PolicyApprovalGate** (see below). A plain PATCH with `status: approved_for_testing` is rejected (409). | The gate records an `ai_runs` audit entry and sets the status. |
| **testing_in_progress** | From approved_for_testing (or directly from ready_for_review if the gate approves). | UI button “Start Testing (gate)”. |
| **supported_by_evidence** | From testing_in_progress. | Requires at least one supporting evidence record that belongs to the program (validated both in the gate and the API). |
| **confirmed_finding** | From supported_by_evidence (or directly from testing_in_progress if the gate permits). | UI button “Confirm Finding”. |
| **rejected / archived** | From any gated or non‑gated status. | UI “Reject” or “Archive”. |

**The Approval Gate (policy‑driven)**
- Click **Approve for Testing** on a hypothesis in `ready_for_review`.
- The gate validates:
  1. The hypothesis has a test plan ≥ 20 chars.
  2. Expected vulnerable & safe results are filled in.
  3. At least one supporting evidence ID exists **and** belongs to the same program.
  4. The program’s policy text does not prohibit testing.
- If all checks pass, the hypothesis status becomes `approved_for_testing` **and** an immutable `ai_runs` row is created (taskType=`hypothesis_approval`, provider=`gate`, model=`policy‑approval`).
- After approval, you can move to `testing_in_progress`, then supply actual test results, and finally mark the hypothesis `supported_by_evidence` or `confirmed_finding`.

*If you try to set `approved_for_testing` via a normal PATCH, the API returns **409** with the message “Status approved_for_testing can only be set via the approval gate.”* This enforces the product principle “researcher approves, deterministic code validates”.

---

## 5. Reports & audit
### 5.1 Drafting a report
1. Open a **confirmed_finding** hypothesis.
2. Click **Draft Report** (AI‑driven).
3. The app calls the LLM with the hypothesis, linked evidence, and a prompt to produce a structured report (title, summary, affected assets, severity, etc.).
4. The response is stored as a `report_draft` and an `ai_runs` entry is written (taskType=`draft_report`).
5. You can then edit the draft, add manual notes, and finally **export** or **submit** it.

### 5.2 Audit logs (`ai_runs`)
Every AI‑driven action that writes a hypothesis, evaluates a program, drafts a report, or approves a hypothesis creates a row in the `ai_runs` table:

| Column | What it stores |
|--------|----------------|
| `id` | UUID (e.g., `approval‑hyp‑id‑12345`). |
| `taskType` | One of `hypothesis_approval`, `draft_report`, `evaluate_program`, … |
| `provider` | `openai`, `anthropic`, `generic` (OpenRouter), etc. |
| `model` | The model name (`nvidia/nemotron-3.5-lightning:free`, `gpt‑4o‑mini`, …). |
| `promptVersion` | Fixed string `1.0` (can be extended). |
| `inputReferenceIdsJson` | JSON array of hypothesis/evidence IDs that were part of the prompt. |
| `outputJson` | The JSON output the model returned (or a summary). |
| `validationStatus` | `valid` / `invalid` / `partial` (set by the app’s schema validation). |
| `createdAt` | Unix‑epoch seconds (automatically set). |

You can inspect these rows by querying the SQLite file directly:
```bash
sqlite3 dev.db "SELECT * FROM ai_runs;"
```

---

## 5. AI provider setup (OpenRouter / OpenAI / Anthropic)
The app can work with three kinds of providers:

| Provider | Env vars (`.env.local`) | What it does |
|----------|------------------------|--------------|
| **OpenAI** | `AI_PROVIDER=openai`<br>`AI_API_KEY=sk‑…`<br>`AI_MODEL=gpt‑4o‑mini`<br>`AI_BASE_URL=https://api.openai.com/v1` | Uses the official OpenAI Chat Completions API. |
| **Anthropic** | `AI_PROVIDER=anthropic` … | Uses Anthropic’s `messages` endpoint. |
| **OpenRouter (generic)** | `AI_PROVIDER=generic` (or `openrouter`)<br>`AI_API_KEY=sk‑or‑v1‑…` (your OpenRouter key)<br>`AI_MODEL=nvidia/nemotron-3.5-lightning:free`<br>`AI_BASE_URL=https://openrouter.ai/api/v1` | Sends a standard OpenAI‑compatible request to OpenRouter, which then routes to the model you specify. **Verified working** with the key you provided. |

**What you need to do** (once, after the initial setup):
1. **Create (or edit) `.env.local`** in the project root:
   ```
   AI_PROVIDER=generic
   AI_BASE_URL=https://openrouter.ai/api/v1
   AI_API_KEY=api-key-example
   AI_MODEL=nvidia/nemotron-3.5-lightning:free
   ```
2. **Restart the dev server** (`npm run dev` after `nvm use 22`).
3. **Test** with the inline Node call we ran earlier – it should output `Hello from the test!`.

If you later want to switch to a different model, just change `AI_MODEL` to any ID returned by `https://openrouter.ai/api/v1/models` (the key you have can list 451 models).

---

## 6. Known current limitations (as of `fix.md`)
| Area | What’s broken / missing | Impact |
|------|------------------------|--------|
| **Form dates** | `policyReviewedAt` now optional (see §2). | Program can be created without a review date. |
| **Status badges** | Console warnings about non‑boolean Tailwind classes (`px‑2`, `py‑1`, etc.) – **fixed** in this session. | No functional impact, just noise. |
| **Dead navigation links** | Several sidebar links (`/assets`, `/hypotheses`, `/evidence`, etc.) return 404 – planned to be removed or re‑pointed. | Users may see 404s when clicking them. |
| **Import/export** | `scripts/import-db.ts` crashes because of `sqlite.Transaction` vs `sqlite.transaction`; backups may contain FTS shadow tables. | Data‑migration not reliable yet. |
| **No UI for session end / edit** | API supports `PATCH` with `endedAt`, but no UI buttons. | Sessions stay “In Progress” forever. |
| **Empty Radix Select values** | Some dropdowns have `value=""` which crashes Radix Select. | Fix listed in `fix.md` (use sentinel `__none__` / `__all__`). |
| **No global search UI** | `GET /api/search` exists but no UI calls it. | Users cannot search across programs/evidence. |
| **No program comparison / settings page** | No UI to compare priority weights or configure weights. | Product‑principle gaps (see `fix.md` P4). |
| **Test suite red** | `npm test` fails (17 failures, 7 failed files). | See `fix.md` P5 for details. |

*Most of these are tracked in `fix.md`; the development focus is on fixing the critical blockers first.*

---

## 7. Quick cheat‑sheet for common tasks
| Task | Command / UI action |
|------|---------------------|
| **List programs** | Open `http://localhost:3000/programs` |
| **Create a program** | Click **New Program**, fill fields, submit. |
| **Adjust evaluation scores** | Drag the six sliders; the total updates instantly. |
| **Generate a hypothesis** | Open a Feature → **Generate Hypotheses** (AI call). |
| **Approve a hypothesis** | In the hypothesis detail, click **Approve for Testing** (gate). |
| **Draft a report** | From a `confirmed_finding` hypothesis, click **Draft Report**. |
| **Change AI provider** | Edit `.env.local` (AI_PROVIDER, AI_BASE_URL, AI_MODEL, AI_API_KEY) and restart the dev server. |
| **View audit rows** | `sqlite3 dev.db "SELECT * FROM ai_runs;"` (Node 22, with nvm). |
| **Run the typecheck/lint/tests** | `npm run typecheck && npm run lint && npm test && npm run build` (see `fix.md` for current status). |

---

### TL;DR
- **Score** = sum of six slider values (0‑5 each). **Not** generated by the LLM.  
- **Sliders** are the six rating controls in the program‑creation form; they let you prioritise the program subjectively.  
- The **user guide** above walks you through creating programs, using the approval gate, generating hypotheses, drafting reports, and configuring the OpenRouter AI provider.  
- Most current bugs are listed in the “Known current limitations” section; the most critical (form date, status‑badge warnings, gate bypass) have been fixed in this session.

If there’s a particular section you’d like to expand (e.g., “how to add a new evidence type” or “how to query the SQLite db for audit rows”), let me know and I’ll add the details.