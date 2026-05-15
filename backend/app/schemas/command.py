from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CommandActionIn(BaseModel):
    feature: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=256)
    status: str = Field(default='saved', max_length=32)
    payload: dict[str, Any] = Field(default_factory=dict)


class CommandActionUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=32)
    payload: Optional[dict[str, Any]] = None


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
