"""Second Brain AI — FastAPI application entry point."""

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import audit, scheduler
from app.actions import approval as approval_svc
from app.actions.executor import ApprovalError, execute_approved_action
from app.agents.router import (
    classify_intent, run_archivist, run_operator,
    run_researcher, run_strategist, run_watcher, run_briefing_scan,
)
from app.config import get_settings
from app.db import get_db, init_db
from app.ingest import ingest_text as ingest_text_fn, ingest_uploaded_file, ingest_url
from app.models import (
    Call, CallSummary, Contact, DailyBriefing, Deadline,
    Memory, OutboundCallRequest, Project, ProposedAction, Task, VoiceContact,
)
from app.retrieve import retrieve, retrieve_context_string
from app.schemas import (
    AuditLogOut, CallOut, CallSummaryOut, CallTranscriptOut,
    ChatRequest, ChatResponse, ContactCreate, ContactOut,
    DeadlineOut, DailyBriefingOut, DocumentOut,
    IngestTextRequest, MemoryCreate, MemoryOut,
    OutboundCallRequestCreate, OutboundCallRequestOut,
    ProjectCreate, ProjectOut,
    ProposedActionCreate, ProposedActionOut,
    ApprovalDecision, RejectionDecision,
    SearchRequest, SearchResponse, SearchHit,
    TaskCreate, TaskOut,
)
from app.verifier import get_final_response, should_block, verify
from app.voice import call_audit_log, outbound_call_approval
from app.voice.call_summary import generate_call_summary
from app.voice.call_transcripts import add_transcript_line, get_transcript
from app.voice.call_memory import store_call_memory
from app.voice.voice_gateway import create_inbound_call, update_call_status
from app.voice.call_router import identify_caller

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    scheduler.start()
    yield
    scheduler.stop()


app = FastAPI(
    title="Second Brain AI",
    version="0.1.0",
    description="Proactive, memory-driven AI OS with approval-gated actions.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}


# ── Memory ─────────────────────────────────────────────────────────────────────

@app.post("/api/memory", response_model=MemoryOut)
async def create_memory(req: MemoryCreate, db: AsyncSession = Depends(get_db)):
    from app.memory import store_memory
    from app.models import MemoryType
    mem = await store_memory(
        db,
        title=req.title,
        content=req.content,
        memory_type=MemoryType(req.memory_type),
        tags=req.tags,
        source=req.source,
        metadata=req.metadata,
    )
    await audit.log_event(db, "memory.created", "api", "memory", str(mem.id))
    return mem


@app.get("/api/memory", response_model=list[MemoryOut])
async def list_memories(
    memory_type: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    from app.memory import list_memories as _list
    return await _list(db, memory_type=memory_type, limit=limit)


@app.get("/api/memory/{memory_id}", response_model=MemoryOut)
async def get_memory(memory_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.memory import get_memory as _get
    mem = await _get(db, memory_id)
    if mem is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return mem


@app.delete("/api/memory/{memory_id}")
async def delete_memory(memory_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.memory import delete_memory as _delete
    ok = await _delete(db, memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    await audit.log_event(db, "memory.deleted", "api", "memory", str(memory_id))
    return {"deleted": True}


# ── Ingest ─────────────────────────────────────────────────────────────────────

@app.post("/api/ingest/text", response_model=MemoryOut)
async def ingest_text_endpoint(req: IngestTextRequest, db: AsyncSession = Depends(get_db)):
    from app.models import MemoryType
    mem = await ingest_text_fn(
        db,
        title=req.title,
        content=req.content,
        source=req.source,
        memory_type=MemoryType(req.memory_type),
        tags=req.tags,
        chunk_size=req.chunk_size,
    )
    await audit.log_event(db, "ingest.text", "api", "memory", str(mem.id))
    return mem


@app.post("/api/ingest/url", response_model=MemoryOut)
async def ingest_url_endpoint(url: str, db: AsyncSession = Depends(get_db)):
    mem = await ingest_url(db, url)
    await audit.log_event(db, "ingest.url", "api", "memory", str(mem.id), payload={"url": url})
    return mem


@app.post("/api/ingest/file")
async def ingest_file_endpoint(
    file: UploadFile = File(...),
    tags: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    doc, mem = await ingest_uploaded_file(
        db,
        file_bytes=content,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        tags=tag_list,
    )
    await audit.log_event(db, "ingest.file", "api", "document", str(doc.id), payload={"filename": file.filename})
    return {"document_id": str(doc.id), "memory_id": str(mem.id), "filename": file.filename}


# ── Search ─────────────────────────────────────────────────────────────────────

@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    result = await retrieve(db, req.query, k=req.k, threshold=req.threshold)
    hits = [
        SearchHit(
            chunk_id=h.chunk_id,
            memory_id=h.memory_id,
            memory_title=h.memory_title,
            content=h.content,
            score=h.score,
            source=h.source,
        )
        for h in result.hits
    ]
    return SearchResponse(query=req.query, hits=hits)


# ── Chat ───────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request, db: AsyncSession = Depends(get_db)):
    context = await retrieve_context_string(db, req.message)
    history = [{"role": m.role, "content": m.content} for m in req.history]

    intent = await classify_intent(req.message)
    agent_name = intent.get("agent", "researcher")

    reply = await run_researcher(req.message, context, history)

    verification = await verify(reply, context, req.message)
    if should_block(verification):
        reply = "I cannot answer this question with confidence based on my current memory. I don't want to fabricate information."
    else:
        reply = get_final_response(reply, verification)

    sources = [h.source for h in (await retrieve(db, req.message)).hits if h.source]

    await audit.log_event(
        db, "chat", agent_name,
        ip_address=request.client.host if request.client else None,
        payload={"agent": agent_name, "confidence": verification.confidence},
    )

    return ChatResponse(
        reply=reply,
        confidence=verification.confidence,
        sources=sources,
        verifier_status=verification.status,
    )


# ── Proposed Actions ───────────────────────────────────────────────────────────

@app.post("/api/actions", response_model=ProposedActionOut)
async def propose_action(req: ProposedActionCreate, db: AsyncSession = Depends(get_db)):
    action = await approval_svc.propose_action(
        db,
        title=req.title,
        action_type=req.action_type,
        reason=req.reason,
        proposed_by=req.proposed_by,
        target=req.target,
        proposed_content=req.proposed_content,
        source_memory_ids=[str(i) for i in req.source_memory_ids],
        risk_level=req.risk_level,
        reversible=req.reversible,
    )
    await audit.log_event(db, "action.proposed", req.proposed_by, "action", str(action.id))
    return action


@app.get("/api/actions/pending", response_model=list[ProposedActionOut])
async def list_pending(db: AsyncSession = Depends(get_db)):
    return await approval_svc.get_pending_actions(db)


@app.get("/api/actions", response_model=list[ProposedActionOut])
async def list_actions(limit: int = 50, db: AsyncSession = Depends(get_db)):
    return await approval_svc.get_all_actions(db, limit=limit)


@app.get("/api/actions/{action_id}", response_model=ProposedActionOut)
async def get_action(action_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    action = await approval_svc.get_action(db, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return action


@app.post("/api/actions/{action_id}/approve", response_model=ProposedActionOut)
async def approve_action(action_id: uuid.UUID, req: ApprovalDecision, db: AsyncSession = Depends(get_db)):
    action = await approval_svc.approve_action(db, action_id, req.reviewer, req.reason)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found or not pending")

    try:
        await execute_approved_action(db, action)
    except Exception as exc:
        logger.error("Execution failed after approval: %s", exc)

    await audit.log_event(db, "action.approved", req.reviewer, "action", str(action_id))
    return action


@app.post("/api/actions/{action_id}/reject", response_model=ProposedActionOut)
async def reject_action(action_id: uuid.UUID, req: RejectionDecision, db: AsyncSession = Depends(get_db)):
    action = await approval_svc.reject_action(db, action_id, req.reviewer, req.reason)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found or not pending")
    await audit.log_event(db, "action.rejected", req.reviewer, "action", str(action_id))
    return action


@app.get("/api/actions/registry/list")
async def get_registry():
    from app.actions.registry import list_actions as _list
    return _list()


# ── Agents ─────────────────────────────────────────────────────────────────────

@app.post("/api/agents/archivist")
async def run_archivist_endpoint(content: str, db: AsyncSession = Depends(get_db)):
    result = await run_archivist(content)
    return result


@app.post("/api/agents/strategist")
async def run_strategist_endpoint(goal: str, db: AsyncSession = Depends(get_db)):
    context = await retrieve_context_string(db, goal)
    return await run_strategist(goal, context)


@app.post("/api/agents/operator")
async def run_operator_endpoint(task: str, db: AsyncSession = Depends(get_db)):
    context = await retrieve_context_string(db, task)
    result = await run_operator(task, context)
    if result.get("proposed_action"):
        pa = result["proposed_action"]
        await approval_svc.propose_action(
            db,
            title=pa.get("title", task[:60]),
            action_type=pa.get("action_type", "draft"),
            reason=f"Operator drafted: {task[:200]}",
            proposed_by="operator",
            proposed_content=result.get("draft"),
            risk_level=pa.get("risk_level", "medium"),
        )
    return result


@app.post("/api/agents/watcher")
async def run_watcher_endpoint(db: AsyncSession = Depends(get_db)):
    from app.memory import list_memories
    memories = await list_memories(db, limit=50)
    summaries = [f"{m.title}: {m.content[:100]}" for m in memories]
    return await run_watcher(summaries)


@app.post("/api/agents/briefing")
async def trigger_briefing(db: AsyncSession = Depends(get_db)):
    result = await run_briefing_scan(db)
    return result


# ── Projects ───────────────────────────────────────────────────────────────────

@app.post("/api/projects", response_model=ProjectOut)
async def create_project(req: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(id=uuid.uuid4(), name=req.name, description=req.description, tags=req.tags)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@app.get("/api/projects", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


# ── Contacts ───────────────────────────────────────────────────────────────────

@app.post("/api/contacts", response_model=ContactOut)
async def create_contact(req: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = Contact(
        id=uuid.uuid4(),
        name=req.name,
        email=req.email,
        phone=req.phone,
        relationship_type=req.relationship_type,
        notes=req.notes,
        tags=req.tags,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@app.get("/api/contacts", response_model=list[ContactOut])
async def list_contacts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).order_by(Contact.name))
    return result.scalars().all()


# ── Tasks ──────────────────────────────────────────────────────────────────────

@app.post("/api/tasks", response_model=TaskOut)
async def create_task(req: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(
        id=uuid.uuid4(),
        title=req.title,
        description=req.description,
        priority=req.priority,
        project_id=req.project_id,
        due_date=req.due_date,
        tags=req.tags,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@app.get("/api/tasks", response_model=list[TaskOut])
async def list_tasks(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Task).order_by(Task.created_at.desc())
    if status:
        q = q.where(Task.status == status)
    result = await db.execute(q)
    return result.scalars().all()


# ── Deadlines ──────────────────────────────────────────────────────────────────

@app.get("/api/deadlines", response_model=list[DeadlineOut])
async def list_deadlines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deadline).order_by(Deadline.due_at))
    return result.scalars().all()


# ── Daily Briefings ────────────────────────────────────────────────────────────

@app.get("/api/briefings", response_model=list[DailyBriefingOut])
async def list_briefings(limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyBriefing).order_by(DailyBriefing.date.desc()).limit(limit))
    return result.scalars().all()


@app.get("/api/briefings/latest", response_model=Optional[DailyBriefingOut])
async def latest_briefing(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyBriefing).order_by(DailyBriefing.date.desc()).limit(1))
    return result.scalar_one_or_none()


# ── Audit ──────────────────────────────────────────────────────────────────────

@app.get("/api/audit", response_model=list[AuditLogOut])
async def get_audit_logs(
    event_type: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    return await audit.get_logs(db, event_type=event_type, actor=actor, limit=limit)


# ── Voice: Inbound ─────────────────────────────────────────────────────────────

@app.post("/api/voice/inbound", response_model=CallOut)
async def handle_inbound_call(
    caller_number: str,
    provider: str = "livekit",
    provider_call_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    call = await create_inbound_call(db, caller_number, provider, provider_call_id)
    await call_audit_log.log_call_event(db, "call.inbound", "gateway", call.id, {"caller": caller_number})
    return call


@app.post("/api/voice/calls/{call_id}/transcript")
async def add_transcript(
    call_id: uuid.UUID,
    speaker: str,
    content: str,
    timestamp_offset: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    line = await add_transcript_line(db, call_id, speaker, content, timestamp_offset)
    return {"id": str(line.id)}


@app.get("/api/voice/calls/{call_id}/transcript", response_model=list[CallTranscriptOut])
async def get_call_transcript(call_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_transcript(db, call_id)


@app.post("/api/voice/calls/{call_id}/end")
async def end_call(call_id: uuid.UUID, duration_seconds: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    from app.models import CallStatus
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")

    call = await update_call_status(db, call, CallStatus.ended, duration_seconds)

    # Generate summary and store memory
    summary = await generate_call_summary(db, call_id)
    if summary:
        await store_call_memory(
            db, call_id,
            caller_name=call.caller_name or call.caller_number or "Unknown",
            summary=summary.summary,
            key_points=summary.key_points,
        )

        # Propose follow-up actions
        from app.voice.call_transcripts import get_transcript_as_dicts
        from app.voice.voice_agent import extract_call_actions
        transcript = await get_transcript_as_dicts(db, call_id)
        actions = await extract_call_actions(transcript)
        for a in actions:
            await approval_svc.propose_action(
                db,
                title=a.get("title", "Call follow-up"),
                action_type=a.get("action_type", "followup"),
                reason=a.get("reason", ""),
                proposed_by="voice_agent",
                risk_level=a.get("risk_level", "low"),
            )

    return {"ended": True, "summary_id": str(summary.id) if summary else None}


@app.get("/api/voice/calls", response_model=list[CallOut])
async def list_calls(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Call).order_by(Call.created_at.desc()).limit(limit))
    return result.scalars().all()


# ── Voice: Outbound ────────────────────────────────────────────────────────────

@app.post("/api/voice/outbound/request", response_model=OutboundCallRequestOut)
async def request_outbound(req: OutboundCallRequestCreate, db: AsyncSession = Depends(get_db)):
    request = await outbound_call_approval.request_outbound_call(
        db, req.to_number, req.purpose, req.to_name, req.script_draft
    )
    await call_audit_log.log_call_event(db, "outbound.requested", "api", details={"to": req.to_number})
    return request


@app.post("/api/voice/outbound/{request_id}/approve", response_model=OutboundCallRequestOut)
async def approve_outbound(request_id: uuid.UUID, reviewer: str, db: AsyncSession = Depends(get_db)):
    req = await outbound_call_approval.approve_outbound_call(db, request_id, reviewer)
    if req is None:
        raise HTTPException(status_code=404, detail="Request not found or not pending")
    await call_audit_log.log_call_event(db, "outbound.approved", reviewer, details={"request_id": str(request_id)})
    return req


@app.get("/api/voice/outbound/pending", response_model=list[OutboundCallRequestOut])
async def list_pending_outbound(db: AsyncSession = Depends(get_db)):
    return await outbound_call_approval.get_pending_outbound(db)
