"""add users table

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('google_sub', sa.String(128), nullable=False, unique=True),
        sa.Column('email', sa.String(256), nullable=False, unique=True),
        sa.Column('name', sa.String(256), nullable=False),
        sa.Column('picture', sa.String(512), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_users_google_sub', 'users', ['google_sub'], unique=True)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Link scans to users (nullable — anonymous scans still work)
    op.add_column('scans', sa.Column('user_id', sa.String(32), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_scans_user_id', 'scans', ['user_id'])


def downgrade():
    op.drop_index('ix_scans_user_id', 'scans')
    op.drop_column('scans', 'user_id')
    op.drop_index('ix_users_email', 'users')
    op.drop_index('ix_users_google_sub', 'users')
    op.drop_table('users')
