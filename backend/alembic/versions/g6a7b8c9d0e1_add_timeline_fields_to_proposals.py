"""add timeline fields to proposals

Revision ID: g6a7b8c9d0e1
Revises: c8d9e0f1a2b3
Create Date: 2026-03-01 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'g6a7b8c9d0e1'
down_revision = 'c8d9e0f1a2b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('proposals', sa.Column('kickoff_date', sa.Date(), nullable=True))
    op.add_column('proposals', sa.Column('red_review_date', sa.Date(), nullable=True))
    op.add_column('proposals', sa.Column('gold_review_date', sa.Date(), nullable=True))
    op.add_column('proposals', sa.Column('submission_deadline', sa.Date(), nullable=True))
    op.add_column('proposals', sa.Column('check_in_meetings', JSONB(), server_default='[]', nullable=True))


def downgrade() -> None:
    op.drop_column('proposals', 'check_in_meetings')
    op.drop_column('proposals', 'submission_deadline')
    op.drop_column('proposals', 'gold_review_date')
    op.drop_column('proposals', 'red_review_date')
    op.drop_column('proposals', 'kickoff_date')
