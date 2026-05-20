"""add hibp_status to scans

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scans', sa.Column('hibp_status', sa.String(16), nullable=True))


def downgrade():
    op.drop_column('scans', 'hibp_status')
