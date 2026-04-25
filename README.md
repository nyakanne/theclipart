# 🧠 Second Brain AI

> A private, local-first AI operating system with long-term memory, multi-agent reasoning, and approval-gated actions.

---

## What it is

Second Brain AI is a personal AI that:

- **Remembers everything** — documents, notes, conversations, calls, observations
- **Thinks proactively** — watches for deadlines, risks, and patterns while you sleep
- **Proposes, never acts** — every external action requires your explicit approval
- **Cites its sources** — every answer is labeled FACT, INFERENCE, or RECOMMENDATION
- **Logs everything** — immutable audit trail of all agent activity

This is not a chatbot. It is an operating system for your mind.

---

## Core principle

```
Agents may research, reason, organize, draft, and propose automatically.
Agents may NOT execute any external action without explicit user approval.
No exceptions.
```

---

## Quick start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY at minimum

# 2. Start everything
docker compose up --build

# 3. Open the UI
open http://localhost:8501

# 4. API docs
open http://localhost:8000/api/docs
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, uvicorn |
| Database | PostgreSQL 16 + pgvector |
| Queue | Redis |
| Scheduling | APScheduler |
| AI — Reasoning | Claude (Anthropic) |
| AI — Embeddings | OpenAI ada-002 or local sentence-transformers |
| Frontend | Streamlit |
| Voice | LiveKit / Twilio |
| Deployment | Docker Compose |

---

## Agent system

| Agent | Role |
|---|---|
| **Archivist** | Ingests and tags new memories |
| **Watcher** | Detects risks, deadlines, and neglected items |
| **Triage** | Prioritizes by urgency × importance |
| **Researcher** | Answers questions from stored memory |
| **Strategist** | Creates plans and roadmaps |
| **Operator** | Drafts emails, letters, documents |
| **Reviewer** | Evaluates risk of proposed actions |
| **Executor** | Runs approved actions only |
| **Auditor** | Logs all system events |

---

## Action approval flow

```
Agent detects something
  → Proposes action (status = pending)
  → Verifier checks accuracy
  → Approval queue (you decide)
  → You approve → Executor runs it
  → You reject → Logged, discarded
  → Audit Agent logs everything
```

---

## Database schema

Core tables: `users`, `memories`, `memory_chunks`, `documents`, `agents`, `tasks`, `projects`, `contacts`, `deadlines`, `daily_briefings`

Action pipeline: `proposed_actions`, `approvals`, `executed_actions`, `audit_logs`

Voice: `calls`, `call_transcripts`, `call_summaries`, `voice_contacts`, `outbound_call_requests`, `call_audit_logs`

---

## UI screens

| Screen | Purpose |
|---|---|
| 🏠 Home | Daily briefing — what was noticed, organized, recommended |
| 💬 Chat | Talk to your second brain with source citations |
| 🌿 Memory Garden | Browse and manage all stored knowledge |
| 📥 Ingest | Add text, URLs, or upload files |
| 🤖 Agent Activity | Run agents manually, view recent events |
| ✅ Approval Queue | Review and approve/reject proposed actions |
| 📞 Call Inbox | Call log, transcripts, outbound approvals |
| 🔍 Truth Check | Semantic search and claim verification |
| 📋 Projects & Tasks | Project and task management |
| 📊 Audit Log | Full system audit trail |
| ⚙️ Settings | Backend connection, action registry |

---

## Voice layer

The system can answer phone calls as your AI assistant:

- Introduces itself as an AI — never impersonates you
- Retrieves relevant memory about the caller
- Logs full transcript
- Generates call summary and key points
- Proposes follow-up actions for your approval
- Outbound calls require explicit approval before dialing

Supports LiveKit (primary) and Twilio (fallback).

---

## Accuracy system

Every response is verified before display:

- Claims labeled: **FACT** / **INFERENCE** / **RECOMMENDATION**
- Confidence scored: **high** / **medium** / **low**
- Verifier returns: **PASS** / **REVISE** / **BLOCK**
- Blocked responses are replaced with an honest "I don't know"

---

## Build phases

- [x] Phase 1: Memory engine + pgvector
- [x] Phase 2: Ingestion pipeline (text, PDF, DOCX, URL)
- [x] Phase 3: Retrieval + RAG chat
- [x] Phase 4: Agent system (9 agents)
- [x] Phase 5: Proposed actions + approval queue
- [x] Phase 6: Verifier system
- [x] Phase 7: Proactive scheduler + daily briefings
- [x] Phase 8: Streamlit UI
- [x] Phase 9: Voice layer (LiveKit / Twilio)
- [ ] Phase 10: MCP integrations (Gmail, Calendar, Notion, GitHub)
- [ ] Phase 11: Next.js web UI
- [ ] Phase 12: Tauri desktop app
- [ ] Phase 13: Textual terminal UI

---

## Project structure

```
.
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── db.py
│       ├── models.py
│       ├── schemas.py
│       ├── memory.py
│       ├── ingest.py
│       ├── retrieve.py
│       ├── verifier.py
│       ├── audit.py
│       ├── scheduler.py
│       ├── agents/
│       │   ├── prompts.py
│       │   └── router.py
│       ├── actions/
│       │   ├── registry.py
│       │   ├── approval.py
│       │   └── executor.py
│       └── voice/
│           ├── voice_gateway.py
│           ├── call_router.py
│           ├── voice_agent.py
│           ├── call_memory.py
│           ├── call_transcripts.py
│           ├── call_summary.py
│           ├── outbound_call_approval.py
│           └── call_audit_log.py
├── frontend/
│   ├── app.py
│   ├── Dockerfile.streamlit
│   └── requirements.streamlit.txt
└── .claude/
    └── agents/
        ├── archivist.md
        ├── watcher.md
        ├── triage.md
        ├── researcher.md
        ├── strategist.md
        ├── operator.md
        ├── reviewer.md
        ├── executor.md
        └── auditor.md
```

---

*A calm, intelligent, observant second mind. It watches everything. It understands patterns. It prepares everything. It asks before acting. It never pretends to know what it does not know.*
