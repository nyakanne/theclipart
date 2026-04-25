import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Memory ─────────────────────────────────────────────────────────────────────

class MemoryCreate(BaseModel):
    title: str
    content: str
    memory_type: str = "note"
    tags: list[str] = []
    source: Optional[str] = None
    metadata: dict[str, Any] = {}


class MemoryOut(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    memory_type: str
    tags: list
    source: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class MemoryChunkOut(BaseModel):
    id: uuid.UUID
    memory_id: uuid.UUID
    content: str
    chunk_index: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Documents ──────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    content_type: str
    summary: Optional[str]
    tags: list
    ingested: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Search ─────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    k: int = Field(default=5, ge=1, le=20)
    threshold: float = Field(default=0.3, ge=0.0, le=1.0)


class SearchHit(BaseModel):
    chunk_id: uuid.UUID
    memory_id: uuid.UUID
    memory_title: str
    content: str
    score: float
    source: Optional[str]
    label: str = "FACT"  # FACT | INFERENCE | RECOMMENDATION


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]
    answer: Optional[str] = None
    confidence: str = "low"  # high | medium | low
    verifier_status: str = "PASS"  # PASS | REVISE | BLOCK


# ── Chat ───────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    confidence: str = "medium"
    sources: list[str] = []
    labels: dict[str, str] = {}  # statement -> FACT | INFERENCE | RECOMMENDATION
    proposed_action_id: Optional[uuid.UUID] = None
    verifier_status: str = "PASS"


# ── Proposed Actions ───────────────────────────────────────────────────────────

class ProposedActionCreate(BaseModel):
    title: str
    action_type: str
    target: Optional[str] = None
    proposed_content: Optional[str] = None
    reason: str
    source_memory_ids: list[uuid.UUID] = []
    risk_level: str = "medium"
    reversible: bool = False
    proposed_by: str = "system"


class ProposedActionOut(BaseModel):
    id: uuid.UUID
    title: str
    action_type: str
    target: Optional[str]
    proposed_content: Optional[str]
    reason: str
    source_memory_ids: list
    risk_level: str
    approval_required: bool
    reversible: bool
    status: str
    proposed_by: str
    reviewer: Optional[str]
    rejection_reason: Optional[str]
    verifier_result: Optional[dict]
    result: Optional[dict]
    created_at: datetime
    approved_at: Optional[datetime]
    executed_at: Optional[datetime]
    model_config = {"from_attributes": True}


class ApprovalDecision(BaseModel):
    reviewer: str
    reason: Optional[str] = None


class RejectionDecision(BaseModel):
    reviewer: str
    reason: str = ""


# ── Tasks ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    project_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    tags: list[str] = []


class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    priority: str
    status: str
    project_id: Optional[uuid.UUID]
    due_date: Optional[datetime]
    tags: list
    created_by_agent: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Projects ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: list[str] = []


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    tags: list
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Contacts ───────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_type: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []


class ContactOut(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    relationship_type: Optional[str]
    notes: Optional[str]
    tags: list
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Deadlines ──────────────────────────────────────────────────────────────────

class DeadlineOut(BaseModel):
    id: uuid.UUID
    title: str
    due_at: datetime
    context: Optional[str]
    status: str
    alerted: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Daily Briefing ─────────────────────────────────────────────────────────────

class DailyBriefingOut(BaseModel):
    id: uuid.UUID
    date: datetime
    noticed: list
    organized: list
    recommendations: list
    pending_approvals: list
    raw_content: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Audit ──────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: uuid.UUID
    event_type: str
    actor: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    reasoning: Optional[str]
    source_memory_ids: list
    payload: dict
    ip_address: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Voice ──────────────────────────────────────────────────────────────────────

class CallOut(BaseModel):
    id: uuid.UUID
    direction: str
    status: str
    caller_number: Optional[str]
    caller_name: Optional[str]
    duration_seconds: Optional[int]
    provider: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


class CallTranscriptOut(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID
    speaker: str
    content: str
    timestamp_offset: Optional[float]
    created_at: datetime
    model_config = {"from_attributes": True}


class CallSummaryOut(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID
    summary: str
    key_points: list
    action_items: list
    sentiment: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class OutboundCallRequestCreate(BaseModel):
    to_number: str
    to_name: Optional[str] = None
    purpose: str
    script_draft: Optional[str] = None


class OutboundCallRequestOut(BaseModel):
    id: uuid.UUID
    to_number: str
    to_name: Optional[str]
    purpose: str
    script_draft: Optional[str]
    status: str
    reviewer: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    model_config = {"from_attributes": True}


class IngestTextRequest(BaseModel):
    content: str
    title: str = "Untitled"
    source: str = "manual"
    memory_type: str = "note"
    tags: list[str] = []
    chunk_size: int = Field(default=300, ge=50, le=1000)
