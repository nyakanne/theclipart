from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


ScanStatus = Literal['idle', 'queued', 'scanning', 'completed', 'failed']
SeverityLevel = Literal['critical', 'high', 'medium', 'low', 'info']


class ScanRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    notify_email: Optional[EmailStr] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v and not re.match(r'^\+?[\d\s\-()\.]{7,20}$', v):
            raise ValueError('Invalid phone number format')
        return v

    def has_any_identifier(self) -> bool:
        return any([self.email, self.phone, self.username, self.full_name])


class ScanJobOut(BaseModel):
    scan_id: str
    status: ScanStatus
    progress: float
    current_stage: str
    estimated_seconds: Optional[int] = None
    created_at: datetime

    model_config = {'from_attributes': True}


class BreachRecordOut(BaseModel):
    id: str
    source: str
    source_type: str
    breach_date: Optional[str] = None
    discovered_date: str
    severity: SeverityLevel
    exposed_fields: list[str]
    record_count: Optional[int] = None
    description: str
    verified: bool

    model_config = {'from_attributes': True}


class BrokerListingOut(BaseModel):
    id: str
    broker_name: str
    broker_url: str
    listing_url: Optional[str] = None
    fields_exposed: list[str]
    opt_out_url: Optional[str] = None
    opt_out_status: str
    opt_out_deadline_days: Optional[int] = None
    dsar_eligible: bool
    last_seen: str

    model_config = {'from_attributes': True}


class HoneyTokenHitOut(BaseModel):
    id: str
    token_id: str
    token_type: str
    hit_source: str
    hit_timestamp: datetime
    context_snippet: Optional[str] = None

    model_config = {'from_attributes': True}


class ComplianceViolationOut(BaseModel):
    regulation: str
    article: Optional[str] = None
    description: str
    severity: SeverityLevel
    broker_name: Optional[str] = None


class ComplianceScoreOut(BaseModel):
    overall: int
    gdpr_score: int
    ccpa_score: int
    risk_level: SeverityLevel
    violations: list[ComplianceViolationOut]
    recommendations: list[str]

    model_config = {'from_attributes': True}


class DsarRequestOut(BaseModel):
    id: str
    scan_id: str
    broker_listing_id: str
    broker_name: str
    status: str
    sent_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    response: Optional[str] = None

    model_config = {'from_attributes': True}


class ScanResultOut(BaseModel):
    scan_id: str
    status: ScanStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    breaches: list[BreachRecordOut]
    broker_listings: list[BrokerListingOut]
    honey_token_hits: list[HoneyTokenHitOut]
    compliance: Optional[ComplianceScoreOut]
    total_exposures: int
    risk_score: float

    model_config = {'from_attributes': True}


class ReportPackageOut(BaseModel):
    scan_id: str
    generated_at: datetime
    download_url: str
    format: str
    includes_dsar: bool
    includes_compliance: bool
    expires_at: datetime
