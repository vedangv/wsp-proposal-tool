"""add compliance_items table

Revision ID: i8c9d0e1f2g3
Revises: h7b8c9d0e1f2
Create Date: 2026-03-01 12:02:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'i8c9d0e1f2g3'
down_revision = 'h7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'compliance_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('proposal_id', UUID(as_uuid=True), sa.ForeignKey('proposals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_compliance_items_proposal_id', 'compliance_items', ['proposal_id'])


def downgrade() -> None:
    op.drop_index('ix_compliance_items_proposal_id')
    op.drop_table('compliance_items')
