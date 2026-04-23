import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Scan(Base):
    __tablename__ = 'scans'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    status: Mapped[str] = mapped_column(
        SAEnum('idle', 'queued', 'scanning', 'completed', 'failed', name='scan_status'),
        default='queued',
    )
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    current_stage: Mapped[str] = mapped_column(String(128), default='queued')
    estimated_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Encrypted PII vault (KMS envelope)
    query_enc: Mapped[str] = mapped_column(Text)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_exposures: Mapped[int] = mapped_column(Integer, default=0)
    notify_email_enc: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    breaches: Mapped[list['BreachRecord']] = relationship(back_populates='scan', cascade='all, delete-orphan')
    broker_listings: Mapped[list['BrokerListing']] = relationship(back_populates='scan', cascade='all, delete-orphan')
    honey_tokens: Mapped[list['HoneyToken']] = relationship(back_populates='scan', cascade='all, delete-orphan')
    dsar_requests: Mapped[list['DsarRequest']] = relationship(back_populates='scan', cascade='all, delete-orphan')
    compliance_result: Mapped['ComplianceResult | None'] = relationship(back_populates='scan', uselist=False, cascade='all, delete-orphan')


class BreachRecord(Base):
    __tablename__ = 'breach_records'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scan_id: Mapped[str] = mapped_column(String(32), ForeignKey('scans.id', ondelete='CASCADE'))
    source: Mapped[str] = mapped_column(String(256))
    source_type: Mapped[str] = mapped_column(String(32))
    breach_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    discovered_date: Mapped[str] = mapped_column(String(32))
    severity: Mapped[str] = mapped_column(String(16))
    exposed_fields: Mapped[list] = mapped_column(JSON)
    record_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text)
    verified: Mapped[bool] = mapped_column(default=False)

    scan: Mapped['Scan'] = relationship(back_populates='breaches')


class BrokerListing(Base):
    __tablename__ = 'broker_listings'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scan_id: Mapped[str] = mapped_column(String(32), ForeignKey('scans.id', ondelete='CASCADE'))
    broker_name: Mapped[str] = mapped_column(String(256))
    broker_url: Mapped[str] = mapped_column(String(512))
    listing_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fields_exposed: Mapped[list] = mapped_column(JSON)
    opt_out_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    opt_out_status: Mapped[str] = mapped_column(String(32), default='not_started')
    opt_out_deadline_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dsar_eligible: Mapped[bool] = mapped_column(default=False)
    last_seen: Mapped[str] = mapped_column(String(32))

    scan: Mapped['Scan'] = relationship(back_populates='broker_listings')


class HoneyToken(Base):
    __tablename__ = 'honey_tokens'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scan_id: Mapped[str] = mapped_column(String(32), ForeignKey('scans.id', ondelete='CASCADE'))
    token_type: Mapped[str] = mapped_column(String(32))
    alias: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    seed_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    hits: Mapped[list['HoneyTokenHit']] = relationship(back_populates='token', cascade='all, delete-orphan')

    scan: Mapped['Scan'] = relationship(back_populates='honey_tokens')


class HoneyTokenHit(Base):
    __tablename__ = 'honey_token_hits'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    token_id: Mapped[str] = mapped_column(String(32), ForeignKey('honey_tokens.id', ondelete='CASCADE'))
    hit_source: Mapped[str] = mapped_column(String(512))
    hit_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    context_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    token: Mapped['HoneyToken'] = relationship(back_populates='hits')


class DsarRequest(Base):
    __tablename__ = 'dsar_requests'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scan_id: Mapped[str] = mapped_column(String(32), ForeignKey('scans.id', ondelete='CASCADE'))
    broker_listing_id: Mapped[str] = mapped_column(String(32), ForeignKey('broker_listings.id', ondelete='CASCADE'))
    broker_name: Mapped[str] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(32), default='draft')
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    response: Mapped[str | None] = mapped_column(Text, nullable=True)

    scan: Mapped['Scan'] = relationship(back_populates='dsar_requests')


class ComplianceResult(Base):
    __tablename__ = 'compliance_results'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scan_id: Mapped[str] = mapped_column(String(32), ForeignKey('scans.id', ondelete='CASCADE'), unique=True)
    overall: Mapped[int] = mapped_column(Integer)
    gdpr_score: Mapped[int] = mapped_column(Integer)
    ccpa_score: Mapped[int] = mapped_column(Integer)
    risk_level: Mapped[str] = mapped_column(String(16))
    violations: Mapped[list] = mapped_column(JSON)
    recommendations: Mapped[list] = mapped_column(JSON)

    scan: Mapped['Scan'] = relationship(back_populates='compliance_result')
