from datetime import datetime
import json
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


def _validate_payload_size(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if value is not None and len(json.dumps(value, default=str).encode()) > 65536:
        raise ValueError('Saved action payload exceeds the 64 KB limit')
    return value


class CommandActionIn(BaseModel):
    feature: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=256)
    status: str = Field(default='saved', max_length=32)
    payload: dict[str, Any] = Field(default_factory=dict)

    _payload_size = field_validator('payload')(_validate_payload_size)


class CommandActionUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=32)
    payload: Optional[dict[str, Any]] = None

    _payload_size = field_validator('payload')(_validate_payload_size)


class CommandActionOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    feature: str
    title: str
    status: str
    payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}
