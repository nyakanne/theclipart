from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from ipaddress import ip_address
import re


ScanStatus = Literal['idle', 'queued', 'scanning', 'completed', 'failed']
SeverityLevel = Literal['critical', 'high', 'medium', 'low', 'info']


class ScanRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    ip_address: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    notify_email: Optional[EmailStr] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v and not re.match(r'^\+?[\d\s\-()\.]{7,20}$', v):
            raise ValueError('Invalid phone number format')
        return v

    @field_validator('ip_address')
    @classmethod
    def validate_ip_address(cls, v: str | None) -> str | None:
        if not v:
            return v
        return str(ip_address(v.strip()))

    def has_any_identifier(self) -> bool:
        return any([self.email, self.phone, self.ip_address, self.username, self.full_name])


class ScanJobOut(BaseModel):
    scan_id: str
    status: ScanStatus
    progress: float
    current_stage: str
    estimated_seconds: Optional[int] = None
    created_at: datetime
    vault_saved: bool = False
    subject: Optional[str] = None
    subject_kind: Optional[str] = None
    total_exposures: int = 0
    risk_score: float = 0.0

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


class OptOutConfirmIn(BaseModel):
    confirmed: bool = False


class OptOutQueueOut(BaseModel):
    queued: int
    skipped: int = 0
    status: str
    message: str


class EvidenceItemOut(BaseModel):
    id: str
    kind: Literal['breach', 'broker_listing', 'honey_token', 'ip_enrichment', 'search_result', 'manual_capture']
    title: str
    source_name: str
    source_category: str
    source_url: str
    detail: str
    risk_level: SeverityLevel
    confidence: str
    captured_at: str
    exposed_fields: list[str]
    action_label: str


class ProviderStatusOut(BaseModel):
    provider: str
    label: str
    status: Literal['completed', 'failed', 'no_match', 'unavailable', 'skipped']
    message: str
    fallback_available: bool = False
    item_count: int = 0


class ManualEvidenceIn(BaseModel):
    title: str
    source_name: str
    source_url: str
    detail: str
    risk_level: SeverityLevel = 'medium'
    source_category: str = 'manual_capture'
    confidence: str = 'manual_capture'
    captured_at: Optional[str] = None
    exposed_fields: list[str] = []
    action_label: str = 'Open source page'


class IpLookupOut(BaseModel):
    ip: str
    network: str | None = None
    asn: str | None = None
    as_name: str | None = None
    as_domain: str | None = None
    country_code: str | None = None
    country: str | None = None
    continent_code: str | None = None
    continent: str | None = None
    is_anycast: bool = False
    is_bogon: bool = False
    source_name: str
    source_url: str


class ImageLookupUrlIn(BaseModel):
    image_url: str


class ImageAnalysisTagOut(BaseModel):
    name: str
    confidence: float


class ImageAnalysisCategoryOut(BaseModel):
    name: str
    score: float


class ImageAnalysisObjectBoxOut(BaseModel):
    x: int
    y: int
    w: int
    h: int


class ImageAnalysisObjectOut(BaseModel):
    name: str
    confidence: float
    box: ImageAnalysisObjectBoxOut


ImageAnalysisProviderName = Literal[
    'azure_computer_vision',
    'google_cloud_vision',
    'huggingface_inference',
]


class ImageAnalysisProviderOut(BaseModel):
    provider: ImageAnalysisProviderName
    status: Literal['completed', 'failed', 'unavailable', 'no_match']
    summary: str
    required_settings: list[str] = Field(default_factory=list)
    caption: str | None = None
    confidence: float | None = None
    tags: list[ImageAnalysisTagOut] = Field(default_factory=list)
    categories: list[ImageAnalysisCategoryOut] = Field(default_factory=list)
    objects: list[ImageAnalysisObjectOut] = Field(default_factory=list)
    adult_score: float | None = None
    racy_score: float | None = None
    provider_url: str | None = None
    width: int | None = None
    height: int | None = None
    format: str | None = None


class ImageAnalysisOut(ImageAnalysisProviderOut):
    provider: Literal['multi_provider']
    provider_results: list[ImageAnalysisProviderOut] = Field(default_factory=list)
    attempted_providers: list[ImageAnalysisProviderName] = Field(default_factory=list)
    completed_providers: list[ImageAnalysisProviderName] = Field(default_factory=list)


class UsernamePlatformOut(BaseModel):
    name: str
    category: str
    url: str
    status: Literal['found', 'not_found', 'protected', 'error']


class PhoneLookupOut(BaseModel):
    input: str
    e164: str
    international: str
    national: str
    country_code: int
    region_code: str | None = None
    country: str = ''
    carrier: str = ''
    line_type: str = 'Unknown'
    timezones: list[str] = Field(default_factory=list)
    valid: bool
    possible: bool


class DomainLookupOut(BaseModel):
    domain: str
    registrar: str | None = None
    created: str | None = None
    expires: str | None = None
    nameservers: list[str] = Field(default_factory=list)
    status: list[str] = Field(default_factory=list)
    error: str | None = None


class DomainIntelUrlscanOut(BaseModel):
    url: str
    title: str = ''
    ip: str = ''
    country: str = ''
    screenshot: str = ''
    scan_date: str = ''
    malicious: bool = False
    score: int | float = 0
    tags: list[str] = Field(default_factory=list)


class DomainIntelVirusTotalOut(BaseModel):
    malicious: int = 0
    suspicious: int = 0
    harmless: int = 0
    undetected: int = 0
    reputation: int = 0
    categories: dict[str, str] = Field(default_factory=dict)
    total_votes: dict[str, int] = Field(default_factory=dict)
    registrar: str = ''
    creation_date: int | None = None
    last_analysis_date: int | None = None
    tags: list[str] = Field(default_factory=list)


class DomainIntelServiceOut(BaseModel):
    port: int | None = None
    product: str = ''
    version: str = ''
    banner: str = ''


class DomainIntelShodanOut(BaseModel):
    ip: str
    org: str = ''
    isp: str = ''
    country: str = ''
    os: str | None = None
    ports: list[int] = Field(default_factory=list)
    hostnames: list[str] = Field(default_factory=list)
    vulns: list[str] = Field(default_factory=list)
    services: list[DomainIntelServiceOut] = Field(default_factory=list)


class DomainIntelAvailabilityOut(BaseModel):
    virustotal: bool = False
    shodan: bool = False


class DomainIntelOut(BaseModel):
    domain: str
    virustotal: DomainIntelVirusTotalOut | None = None
    urlscan: list[DomainIntelUrlscanOut] = Field(default_factory=list)
    shodan: DomainIntelShodanOut | None = None
    available: DomainIntelAvailabilityOut


class ScanResultOut(BaseModel):
    scan_id: str
    status: ScanStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    query: ScanRequest
    vault_saved: bool = False
    breaches: list[BreachRecordOut]
    broker_listings: list[BrokerListingOut]
    honey_token_hits: list[HoneyTokenHitOut]
    compliance: Optional[ComplianceScoreOut]
    evidence_items: list[EvidenceItemOut]
    provider_status: list[ProviderStatusOut]
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


class ReportJobOut(BaseModel):
    action_id: str
    scan_id: str
    status: str
    format: str
    generated_at: Optional[datetime] = None
    download_url: Optional[str] = None
    includes_dsar: Optional[bool] = None
    includes_compliance: Optional[bool] = None
    expires_at: Optional[datetime] = None
    error: Optional[str] = None
