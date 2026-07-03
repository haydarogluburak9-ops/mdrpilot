# MDRpilot

AI-assisted documentation platform for medical device manufacturers. MDRpilot helps you prepare
**MDR 2017/745**, **ISO 13485**, **ISO 9001** and **ISO 14971** documentation — technical files,
GSPR checklists, risk files, IFU/labeling, PMS/PMCF plans and QMS documents — with traceability,
versioning and an **audit readiness score**.

> ⚠️ **Important:** MDRpilot produces **drafts, gap analyses and checklists only**. It does **not**
> provide regulatory approval, CE marking clearance or legal advice. Final assessment must be done by
> a qualified person and, where applicable, your Notified Body.

---

## ✨ Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Portfolio KPIs, compliance/risk charts, upcoming audits, open CAPAs |
| **Product / Device Management** | Full device record (class, UDI, sterility, materials…) with a tabbed detail view |
| **Technical File Generator** | MDR Annex II/III structure with per-section status, owners and AI gap analysis |
| **GSPR Checklist** | MDR Annex I requirements mapped to evidence; missing evidence highlighted in red |
| **ISO 14971 Risk Management** | Hazard table, 5×5 initial/residual risk matrices, AI-suggested hazards |
| **Clinical Evaluation** | CER structure + AI draft and clinical data gap flags |
| **PMS / PMCF** | Surveillance plans proportionate to device class |
| **IFU & Label Generator** | IFU drafting, label preview, risk/IFU alignment check |
| **QMS Document Center** | ISO 13485 (18 SOPs) + ISO 9001 sections, versioned, AI drafting |
| **Audit Readiness** | Weighted 0–100 score per device with prioritized actions |
| **AI Regulatory Assistant** | Context-aware chat drawer scoped to a product |
| **File Center** | Upload + AI classification with prompt-injection protection |
| **Export Center** | Word / PDF / Excel / ZIP export buttons (UI wired, generation stubbed) |

---

## 🧱 Tech stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · shadcn-style UI primitives
- **Framer Motion** (assistant drawer animations) · **Recharts** (dashboard charts) · **lucide-react** icons
- **Prisma ORM** + **PostgreSQL** (schema + seed included)
- **AI provider abstraction** (OpenAI-compatible) with a **deterministic mock engine** and graceful fallback
- **Zod** for input/output validation

---

## 🚀 Getting started

### 1. Install

```bash
npm install
```

### 2. Start PostgreSQL

The app now uses a **real PostgreSQL database** with real authentication. Easiest path is Docker:

```bash
docker run -d --name meddoc-postgres \
  -e POSTGRES_USER=meddoc -e POSTGRES_PASSWORD=meddoc -e POSTGRES_DB=meddoc \
  -p 5433:5432 postgres:16-alpine
```

(Any PostgreSQL 14+ works — just point `DATABASE_URL` at it.)

### 3. Configure environment

```bash
cp .env.example .env
```

The example `.env` is already wired to the Docker container above (`localhost:5433`). Generate a real
`AUTH_SECRET` (e.g. `openssl rand -base64 32`). `AI_PROVIDER=mock` keeps AI fully offline/deterministic.

### 4. Migrate + seed the database

```bash
npm run db:generate     # prisma generate
npm run db:migrate      # apply migrations (creates all tables)
npm run db:seed         # seed company "Yılmaz Bio Medikal" + demo users + 3 products
npm run db:studio       # (optional) browse data
```

### 5. Run

```bash
npm run dev             # or: npm run build && npm run start
```

Open http://localhost:3000. Sign in at `/login` with the demo account below.

### 🔑 Demo login

| Role            | Email                      | Password    |
| --------------- | -------------------------- | ----------- |
| Owner           | `elif@yilmazbio.com`       | `Demo1234!` |
| Quality Manager | `quality@yilmazbio.com`    | `Demo1234!` |
| Viewer          | `viewer@yilmazbio.com`     | `Demo1234!` |

All belong to **Yılmaz Bio Medikal**. After login you land on the company dashboard; all data is
isolated per company (a user can never see another company's products, files, AI analyses or exports).
The Viewer can download existing exports but cannot create or delete them.

### Verify the backend

```bash
npm run test:isolation  # asserts company data isolation at the DB layer
npm run test:exports    # end-to-end export tests (needs dev server running on :3000)
```

> `test:exports` logs in over HTTP, so run it against `npm run dev` (the production server sets
> `Secure` cookies that browsers/clients won't send over plain `http://localhost`).

---

## 📤 Export system (Word / Excel / PDF / ZIP)

Real document generation backed by the `ExportJob` model and a pluggable storage provider.

- **DOCX** via `docx`, **XLSX** via `exceljs`, **PDF** via `pdfkit`, **ZIP** via `archiver`.
- Files are written to a **private** directory (`STORAGE_EXPORTS_DIR`, default `./storage/exports`) and
  are **never** served from a public path — only streamed through an authorized download endpoint.
- The storage layer (`src/lib/storage/`) is an abstraction so a future S3/GCS provider drops in cleanly.

### Export types

`FULL_MDR_TECHNICAL_FILE_ZIP`, `TECHNICAL_FILE_DOCX`, `GSPR_XLSX`, `RISK_XLSX`, `IFU_DOCX`,
`LABEL_PDF`, `PMS_PMCF_DOCX`, `QMS_PACKAGE_ZIP`, `AUDIT_READINESS_PDF`, `PRODUCT_DOSSIER_ZIP`.

### Endpoints

| Method   | Route                          | Auth                     | Purpose                             |
| -------- | ------------------------------ | ------------------------ | ----------------------------------- |
| `POST`   | `/api/exports`                 | ≥ Consultant             | Create an export (generates + saves)|
| `GET`    | `/api/exports`                 | Any company member       | Company-scoped export history       |
| `GET`    | `/api/exports/[id]/download`   | Any company member       | Stream the file (404 cross-company) |
| `DELETE` | `/api/exports/[id]`            | Owner / Quality Manager  | Delete export + stored file         |

Every action is recorded in `AuditLog` (`export.create`, `export.download`, `export.delete`,
`export.failed`). Failed generations mark the job `FAILED` and persist the error message.

The **Export Center** (`/exports`) provides a create modal, status, size, creator, date, download
and delete; product-detail tabs (Technical File, GSPR, Risk, IFU, Audit) export directly to the API.

### 6. (Optional) Enable live AI

In `.env`:

```env
AI_PROVIDER=openai
AI_API_KEY=sk-...          # server-only, never exposed to the browser
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Works with any OpenAI-compatible endpoint (OpenAI, Azure-style gateways, Ollama/LM Studio).

---

## 🗂️ Project structure

```
prisma/
  schema.prisma            # all DB models (User, Company, Product, GSPRItem, RiskItem, …)
  seed.ts                  # demo seed data
src/
  app/
    page.tsx               # landing page
    (auth)/                # login / register / onboarding
    (app)/                 # authenticated shell (sidebar + topbar + AI drawer)
      dashboard/ products/ technical-file/ gspr/ risk/ clinical/
      pms/ ifu/ qms/ audit/ files/ settings/ billing/
    api/ai/[promptId]/     # generic AI endpoint (rate-limited, validated)
    api/ai/assistant/      # chat assistant endpoint
  components/
    ui/                    # button, card, badge, tabs, score-ring, status-badge, …
    layout/                # sidebar, topbar, ai-assistant drawer, nav-config
    charts/                # recharts dashboard charts
    modules/               # technical-file/gspr/risk tables, export buttons
    risk/                  # 5×5 risk matrix
    ai/                    # AiPanel (generate + render results)
  lib/
    ai/
      prompts/             # technical-file, gspr, risk, ifu, cer, pms, qms, audit, file-analysis
      providers/openai.ts  # OpenAI-compatible provider
      mock.ts              # deterministic mock generators / fallback
      orchestrator.ts      # runPrompt() — validate → call → validate → fallback
      types.ts             # Zod AiResult schema + interfaces
    domain/                # types, regulatory constants, scoring engine
    data/mock.ts           # in-memory demo dataset
    auth/session.ts        # session + role helpers (mock; swap for real auth)
    security/rate-limit.ts # in-memory fixed-window limiter
    env.ts                 # server-only env access
    db.ts                  # Prisma client singleton
```

---

## 🤖 AI architecture

Every regulatory prompt is a typed `PromptDefinition` (system instruction + input schema + user
builder). `runPrompt(promptId, input)`:

1. Validates input with Zod.
2. Uses the live provider if configured, otherwise the deterministic mock.
3. Parses the model's JSON, validates it against the canonical `AiResult` schema.
4. **Falls back to the mock** if the provider errors or returns malformed JSON.

Canonical AI output:

```json
{
  "summary": "",
  "complianceStatus": "partial",
  "missingItems": [],
  "risks": [],
  "recommendedDocuments": [],
  "regulatoryReferences": [],
  "confidence": 0.78,
  "disclaimer": ""
}
```

---

## 📚 Standards Knowledge Base + RAG (clause citations)

The `/standards` module powers clause-level citations across AI Composer, File Analysis and Audit
Readiness via a lightweight Retrieval-Augmented Generation (RAG) pipeline.

- **Models:** `Standard`, `StandardClause`, `KnowledgeChunk`, `AICitation`.
- **Sources:** `PUBLIC_REGULATION` (e.g. MDR 2017/745 references), `TEMPLATE_SUMMARY` (paraphrased
  clause summaries), `USER_UPLOADED_LICENSED` and `INTERNAL_PROCEDURE` (your private documents).
- **Pipeline (`src/lib/rag/`):**
  - `indexer.ts` — stores a local term-frequency "embedding" in `KnowledgeChunk.embeddingJson`.
  - `retriever.ts` — company-isolated keyword + semantic-like cosine scoring over clauses/chunks.
  - `citation-builder.ts` — resolves AI/declared citations to real `standardId`/`clauseId` and persists `AICitation`.
  - `audit-gaps.ts` — deterministic clause-level audit gaps (e.g. *MDR Annex I 10.1 — Biological safety evidence missing*).
- **AI output** now includes a `citations` array: `{ standardCode, clauseNo, reason, confidence }`.
  Composer documents render per-section *Relevant clauses* and a final *Regulatory References* section.
- **Future-proofing:** the retriever/indexer are storage-agnostic so the local vectors can be swapped
  for `pgvector` or Qdrant without changing call sites.

### ⚠️ Copyright / licensing note

**Full ISO standard texts are NOT stored or seeded.** The knowledge base contains only:

- short **paraphrased** clause summaries and clause titles (`TEMPLATE_SUMMARY`),
- references to the **public** EU MDR regulation (`PUBLIC_REGULATION`),
- content **you upload** (licensed standards / internal procedures), which stays **private to your
  company** (`isPublic = false`) and is used only for your own RAG retrieval.

Upload only standards your organisation is licensed to use.

---

## 🧠 Compliance Consultant AI (Consultant · Audit Simulator · Executive)

Three AI-intelligence modules built on top of the dossier, RAG and export systems. All are
company-isolated and role-gated (Viewers cannot run analyses or start audits).

### Compliance Consultant — `/consultant`
Acts as a regulatory consultant whose goal is **to find gaps, not to write documents**. Pick a
product and a standard scope (`MDR`, `ISO 13485`, `ISO 14971`, `ISO 9001`, `Combined`) and run
*Analyze Compliance*. It scans the Product, Technical File, GSPR, Risk, Clinical, PMS, IFU/Label,
QMS documents, Uploaded Files, Evidence Links, Standards Library, AI Citations, Composer Documents,
Audit Findings and CAPA.

- **Output:** an overall score (0-100, Red/Yellow/Green) plus 9 category sub-scores (Technical File,
  GSPR, Risk, Clinical, PMS, QMS, Evidence Coverage, Documentation Quality, Traceability), a detailed
  **Gap Analysis** (severity, clause, why-it-matters, current situation, action, effort, quick-win,
  dependencies, evidence needed, confidence), an AI-ranked **Top 5 Actions** and a **30-Day Plan**.
- **Engine (`src/lib/compliance/`):** `snapshot.ts` (cross-module loader), `engine.ts` (deterministic
  scoring + gap rules + roadmap, always works without an AI key), `ai.ts` (optional AI augmentation),
  `executive.ts` (leadership aggregation). Prompt: `src/lib/ai/prompts/consultant.prompt.ts`.
- **API:** `POST /api/consultant/analyze` (CONSULTANT+).

### Audit Simulator — `/audit-simulator`
Simulates a certification auditor. Choose a standard and assessment depth (`Quick` 5, `Standard` 10,
`Full` 18 questions). The AI/engine asks auditor-style questions, you answer, then *Complete* scores
the audit and produces findings + CAPA.

- **Models:** `AuditSession`, `AuditQuestion`, `AuditAnswer`, `AuditSimFinding`.
- **Output:** Audit Score (0-100), Finding Summary (Major / Minor / Observation / Positive), detailed
  findings (standard, clause, description, evidence, root cause, corrective action, due date, priority)
  and AI **CAPA suggestions**.
- **Exports (via ExportJob → Export Center):** Audit Report **PDF/DOCX**, Audit Findings **XLSX**,
  CAPA Plan **XLSX** (`src/lib/audit-sim/export.ts`).
- **API:** `POST /api/audit-simulator` (start, CONSULTANT+), `GET /api/audit-simulator[/:id]`,
  `PATCH /api/audit-simulator/:id/answer`, `POST /api/audit-simulator/:id/complete`,
  `POST /api/audit-simulator/:id/export`, `POST /api/audit-simulator/:id/archive` (QUALITY_MANAGER+).
- **Prompts:** `audit-simulator.prompt.ts`, `audit-report.prompt.ts`, `capa-recommendation.prompt.ts`.

### Executive Dashboard — `/executive`
Leadership view: Overall Compliance, Products At Risk, Open/Overdue CAPA, Major Findings, Audits In
Progress, Evidence Coverage, Top Risks and Top Missing Documents, plus charts (compliance by product,
audit score trend, CAPA trend, residual risk distribution, CAPA by status, findings by severity).

> All three modules always produce results deterministically; when `AI_PROVIDER=openai` is configured
> the output is enriched by the model and falls back safely to the deterministic engine on any error.

E2E coverage: `npm run test:consultant-audit` (37 checks — analysis, gaps, roadmap, audit flow,
findings, exports, RBAC, company isolation and audit-log assertions).

---

## 🔒 Security notes (production hardening)

- ✅ AI keys are **server-only** (`src/lib/env.ts`); never sent to the client.
- ✅ Every API route resolves a session and is **rate-limited**.
- ✅ Uploaded file text is treated as **untrusted data** — the system prompt explicitly forbids
  following instructions inside documents (**prompt-injection protection**).
- ✅ `.env.example` documents upload size/MIME limits and storage strategy.
- ⚠️ **Before going live**, implement: real auth + httpOnly session cookies, **company isolation**
  (scope every query by `companyId`), private object storage with signed URLs, an `AuditLog` writer,
  and Redis-backed rate limiting for multi-instance deployments. These seams already exist in the code.

---

## 🧭 Roadmap (intentionally staged)

The foundation and core modules (Dashboard, Products, Technical File, GSPR, Risk, QMS, Audit, Files,
AI infra) are built. Next, in order: real auth + DB wiring → server-side document generation (Word/PDF/
Excel) → RAG over uploaded evidence → EUDAMED/UDI integrations.

---

## 📜 Disclaimer

MDRpilot is a documentation **support** tool. It does not replace regulatory expertise, a Notified
Body, or a conformity assessment. Always have outputs reviewed by qualified personnel.
