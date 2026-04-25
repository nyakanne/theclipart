"""Action registry: defines all allowed action types with metadata."""

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional


@dataclass
class ActionDef:
    name: str
    description: str
    risk_level: str  # low | medium | high | critical
    reversible: bool
    requires_approval: bool
    parameters: dict[str, Any]
    handler: Optional[Callable[..., Awaitable[dict]]] = None
    external: bool = True  # True = touches the outside world


_REGISTRY: dict[str, ActionDef] = {}


def register(action: ActionDef) -> None:
    _REGISTRY[action.name] = action


def get(name: str) -> Optional[ActionDef]:
    return _REGISTRY.get(name)


def list_actions() -> list[dict[str, Any]]:
    return [
        {
            "name": a.name,
            "description": a.description,
            "risk_level": a.risk_level,
            "reversible": a.reversible,
            "requires_approval": a.requires_approval,
            "external": a.external,
            "parameters": a.parameters,
        }
        for a in _REGISTRY.values()
    ]


# ── Internal (safe, no approval needed) ───────────────────────────────────────

async def _create_note(title: str, body: str, **_) -> dict:
    import datetime
    import pathlib
    notes_dir = pathlib.Path("/app/data/notes")
    notes_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    safe_title = title[:40].replace(" ", "_").replace("/", "-")
    path = notes_dir / f"{ts}_{safe_title}.md"
    path.write_text(f"# {title}\n\n{body}\n")
    return {"path": str(path), "title": title}


async def _organize_tags(memory_id: str, tags: list[str], **_) -> dict:
    return {"memory_id": memory_id, "tags_applied": tags}


# ── External (require approval) ────────────────────────────────────────────────

async def _send_email(to: str, subject: str, body: str, **_) -> dict:
    # Real implementation would use SendGrid / SES
    return {"status": "sent", "to": to, "subject": subject}


async def _create_calendar_event(title: str, start: str, end: str, description: str = "", **_) -> dict:
    return {"status": "created", "title": title, "start": start, "end": end}


async def _publish_content(platform: str, content: str, **_) -> dict:
    return {"status": "published", "platform": platform}


async def _delete_file(path: str, **_) -> dict:
    import pathlib
    p = pathlib.Path(path)
    if p.exists():
        p.unlink()
        return {"status": "deleted", "path": path}
    return {"status": "not_found", "path": path}


# ── Registration ───────────────────────────────────────────────────────────────

register(ActionDef(
    name="create_note",
    description="Create a local markdown note",
    risk_level="low",
    reversible=True,
    requires_approval=False,
    external=False,
    parameters={"title": {"type": "string"}, "body": {"type": "string"}},
    handler=_create_note,
))

register(ActionDef(
    name="organize_tags",
    description="Apply tags to a memory",
    risk_level="low",
    reversible=True,
    requires_approval=False,
    external=False,
    parameters={"memory_id": {"type": "string"}, "tags": {"type": "array"}},
    handler=_organize_tags,
))

register(ActionDef(
    name="send_email",
    description="Send an email to a recipient",
    risk_level="high",
    reversible=False,
    requires_approval=True,
    external=True,
    parameters={"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}},
    handler=_send_email,
))

register(ActionDef(
    name="create_calendar_event",
    description="Create a calendar event",
    risk_level="medium",
    reversible=True,
    requires_approval=True,
    external=True,
    parameters={"title": {"type": "string"}, "start": {"type": "string"}, "end": {"type": "string"}},
    handler=_create_calendar_event,
))

register(ActionDef(
    name="publish_content",
    description="Publish content to a platform",
    risk_level="high",
    reversible=False,
    requires_approval=True,
    external=True,
    parameters={"platform": {"type": "string"}, "content": {"type": "string"}},
    handler=_publish_content,
))

register(ActionDef(
    name="delete_file",
    description="Permanently delete a local file",
    risk_level="critical",
    reversible=False,
    requires_approval=True,
    external=False,
    parameters={"path": {"type": "string"}},
    handler=_delete_file,
))
