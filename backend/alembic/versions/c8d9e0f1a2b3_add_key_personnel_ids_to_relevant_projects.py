"""add key_personnel_ids to relevant_projects

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-03-01 00:06:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'c8d9e0f1a2b3'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('relevant_projects',
        sa.Column('key_personnel_ids', JSONB, server_default='[]', nullable=False)
    )


def downgrade():
    op.drop_column('relevant_projects', 'key_personnel_ids')
