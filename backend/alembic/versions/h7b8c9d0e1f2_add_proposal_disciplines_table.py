"""add proposal_disciplines table

Revision ID: h7b8c9d0e1f2
Revises: g6a7b8c9d0e1
Create Date: 2026-03-01 12:01:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'h7b8c9d0e1f2'
down_revision = 'g6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'proposal_disciplines',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('proposal_id', UUID(as_uuid=True), sa.ForeignKey('proposals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('discipline_name', sa.String(), nullable=False),
        sa.Column('contact_name', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='not_contacted'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_proposal_disciplines_proposal_id', 'proposal_disciplines', ['proposal_id'])


def downgrade() -> None:
    op.drop_index('ix_proposal_disciplines_proposal_id')
    op.drop_table('proposal_disciplines')
