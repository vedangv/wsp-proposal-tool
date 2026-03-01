"""add proposal_templates table

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-03-01 00:05:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = 'b7c8d9e0f1a2'
down_revision = 'a6b7c8d9e0f1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'proposal_templates',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('description', sa.String, nullable=True),
        sa.Column('template_data', JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('proposal_templates')
