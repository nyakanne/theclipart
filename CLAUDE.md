# Second Brain AI — Claude Code Guide

## What this is

A private, local-first AI operating system with long-term memory, multi-agent reasoning, and approval-gated actions. It watches, organizes, and proposes — but **never acts without explicit user approval**.

## Architecture

```
docker-compose.yml
├── postgres (pgvector) — memory + embeddings
├── redis               — task queue
├── backend (FastAPI)   — API + agents + scheduler
└── frontend (Streamlit)— UI
```

## Key directories

```
backend/app/
├── main.py          — FastAPI app, all routes
├── config.py        — Settings (pydantic-settings, reads .env)
├── db.py            — Async SQLAlchemy + pgvector init
├── models.py        — All DB models (20+ tables)
├── schemas.py       — Pydantic request/response schemas
├── memory.py        — Embed, store, search memory chunks
├── ingest.py        — PDF, DOCX, TXT, URL ingestion
├── retrieve.py      — RAG retrieval with source citation
├── verifier.py      — Accuracy verification (PASS/REVISE/BLOCK)
├── audit.py         — Immutable audit logging
├── scheduler.py     — APScheduler (daily briefing, deadline scan)
├── agents/
│   ├── prompts.py   — System prompts for all 9 agents
│   └── router.py    — Intent classification + agent dispatch
├── actions/
│   ├── registry.py  — Action definitions with risk metadata
│   ├── approval.py  — Propose, approve, reject actions
│   └── executor.py  — Execute ONLY approved actions
└── voice/
    ├── voice_gateway.py          — LiveKit/Twilio call lifecycle
    ├── call_router.py            — Caller identification
    ├── voice_agent.py            — AI conversation during calls
    ├── call_memory.py            — Store call notes to memory
    ├── call_transcripts.py       — Transcript management
    ├── call_summary.py           — Post-call summarization
    ├── outbound_call_approval.py — Outbound call approval
    └── call_audit_log.py         — Call-specific audit logs

frontend/
└── app.py           — Streamlit UI (10 screens)

.claude/agents/      — Claude Code subagent definitions
```

## Running locally

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and OPENAI_API_KEY (or set EMBED_PROVIDER=local)
docker compose up --build
```

- Backend API: http://localhost:8000/api/docs
- Streamlit UI: http://localhost:8501

## Environment variables (important ones)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (required) |
| `OPENAI_API_KEY` | Embeddings via OpenAI ada-002 (or set EMBED_PROVIDER=local) |
| `EMBED_PROVIDER` | `openai` or `local` (local uses sentence-transformers 384d) |
| `EMBED_DIM` | Must match model: 1536 for OpenAI, 384 for local |
| `REQUIRE_APPROVAL` | Always `true` — never bypass |
| `AUTO_APPROVE_LOW_RISK` | Default `false` — set `true` only for internal actions |

## The non-negotiable rule

**Agents may never execute external actions without `status = approved`.**

The executor (`actions/executor.py`) checks `action.status == ActionStatus.approved` before every execution and raises `ApprovalError` if not. This is the single enforcement point — do not weaken it.

## Database migrations

The app auto-creates tables on startup via `init_db()`. For production, use Alembic:

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Embedding dimensions

If you change `EMBED_PROVIDER` from `openai` (1536d) to `local` (384d), you must:
1. Update `EMBED_DIM` in `.env`
2. Drop and recreate the `memory_chunks` table (the `embedding` column dimension is fixed at creation)
3. Re-ingest all documents

## Agent system

Agents are dispatched from `agents/router.py` based on intent classification. Each agent has:
- A system prompt in `agents/prompts.py`
- A Claude Code subagent definition in `.claude/agents/`
- A corresponding API endpoint in `main.py`

To add a new agent:
1. Add its system prompt to `agents/prompts.py`
2. Add a `run_<name>()` function to `agents/router.py`
3. Add an API endpoint in `main.py`
4. Create `.claude/agents/<name>.md`

## Voice layer

The voice layer requires LiveKit or Twilio credentials in `.env`. Without them, the voice endpoints still work but calls won't actually connect. The AI conversation logic in `voice/voice_agent.py` uses Claude and works independently of the telephony provider.

## Common tasks for Claude Code

- **Add a new action type**: Add to `actions/registry.py` with `register(ActionDef(...))`
- **Add a new memory type**: Add to `MemoryType` enum in `models.py`
- **Add a new API route**: Add to `main.py`, follow existing patterns
- **Debug agent output**: Check `/api/audit` endpoint or audit_logs table
- **Check pending actions**: GET `/api/actions/pending`
- **Trigger briefing manually**: POST `/api/agents/briefing`
