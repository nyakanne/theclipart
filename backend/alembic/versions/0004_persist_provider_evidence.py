"""persist provider evidence snapshots

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scans', sa.Column('provider_evidence_enc', sa.Text(), nullable=True))
    op.add_column('scans', sa.Column('provider_status_enc', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('scans', 'provider_status_enc')
    op.drop_column('scans', 'provider_evidence_enc')
