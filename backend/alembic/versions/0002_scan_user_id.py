"""add scan user ownership

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scans', sa.Column('user_id', sa.String(length=128), nullable=True))
    op.create_index('ix_scans_user_id', 'scans', ['user_id'])


def downgrade():
    op.drop_index('ix_scans_user_id', table_name='scans')
    op.drop_column('scans', 'user_id')
