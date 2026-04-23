"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-23
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE TYPE scan_status AS ENUM ('idle','queued','scanning','completed','failed')")

    op.create_table(
        'scans',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('status', sa.Enum('idle', 'queued', 'scanning', 'completed', 'failed', name='scan_status'), nullable=False, server_default='queued'),
        sa.Column('progress', sa.Float, nullable=False, server_default='0'),
        sa.Column('current_stage', sa.String(128), nullable=False, server_default='queued'),
        sa.Column('estimated_seconds', sa.Integer, nullable=True),
        sa.Column('query_enc', sa.Text, nullable=False),
        sa.Column('risk_score', sa.Float, nullable=False, server_default='0'),
        sa.Column('total_exposures', sa.Integer, nullable=False, server_default='0'),
        sa.Column('notify_email_enc', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_scans_created_at', 'scans', ['created_at'])

    op.create_table(
        'breach_records',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('scan_id', sa.String(32), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source', sa.String(256), nullable=False),
        sa.Column('source_type', sa.String(32), nullable=False),
        sa.Column('breach_date', sa.String(32), nullable=True),
        sa.Column('discovered_date', sa.String(32), nullable=False),
        sa.Column('severity', sa.String(16), nullable=False),
        sa.Column('exposed_fields', sa.JSON, nullable=False),
        sa.Column('record_count', sa.Integer, nullable=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('verified', sa.Boolean, nullable=False, server_default='false'),
    )
    op.create_index('ix_breach_records_scan_id', 'breach_records', ['scan_id'])

    op.create_table(
        'broker_listings',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('scan_id', sa.String(32), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_name', sa.String(256), nullable=False),
        sa.Column('broker_url', sa.String(512), nullable=False),
        sa.Column('listing_url', sa.String(512), nullable=True),
        sa.Column('fields_exposed', sa.JSON, nullable=False),
        sa.Column('opt_out_url', sa.String(512), nullable=True),
        sa.Column('opt_out_status', sa.String(32), nullable=False, server_default='not_started'),
        sa.Column('opt_out_deadline_days', sa.Integer, nullable=True),
        sa.Column('dsar_eligible', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('last_seen', sa.String(32), nullable=False),
    )
    op.create_index('ix_broker_listings_scan_id', 'broker_listings', ['scan_id'])

    op.create_table(
        'honey_tokens',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('scan_id', sa.String(32), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_type', sa.String(32), nullable=False),
        sa.Column('alias', sa.String(256), nullable=False, unique=True),
        sa.Column('seed_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_honey_tokens_alias', 'honey_tokens', ['alias'], unique=True)

    op.create_table(
        'honey_token_hits',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('token_id', sa.String(32), sa.ForeignKey('honey_tokens.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hit_source', sa.String(512), nullable=False),
        sa.Column('hit_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('context_snippet', sa.Text, nullable=True),
    )

    op.create_table(
        'dsar_requests',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('scan_id', sa.String(32), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_listing_id', sa.String(32), sa.ForeignKey('broker_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_name', sa.String(256), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='draft'),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deadline_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response', sa.Text, nullable=True),
    )

    op.create_table(
        'compliance_results',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('scan_id', sa.String(32), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('overall', sa.Integer, nullable=False),
        sa.Column('gdpr_score', sa.Integer, nullable=False),
        sa.Column('ccpa_score', sa.Integer, nullable=False),
        sa.Column('risk_level', sa.String(16), nullable=False),
        sa.Column('violations', sa.JSON, nullable=False),
        sa.Column('recommendations', sa.JSON, nullable=False),
    )


def downgrade():
    op.drop_table('compliance_results')
    op.drop_table('dsar_requests')
    op.drop_table('honey_token_hits')
    op.drop_table('honey_tokens')
    op.drop_table('broker_listings')
    op.drop_table('breach_records')
    op.drop_table('scans')
    op.execute('DROP TYPE scan_status')
