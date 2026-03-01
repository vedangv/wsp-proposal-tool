"""add target_dlm, team_dlm_targets, phases to proposals

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-03-01 00:03:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'f5a6b7c8d9e0'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('proposals',
        sa.Column('target_dlm', sa.Float(), nullable=True, server_default='3.0')
    )
    op.add_column('proposals',
        sa.Column('team_dlm_targets', JSONB(), nullable=True, server_default='{}')
    )
    op.add_column('proposals',
        sa.Column('phases', JSONB(), nullable=True,
                  server_default='["Study", "Preliminary", "Detailed", "Tender", "Construction"]')
    )


def downgrade():
    op.drop_column('proposals', 'phases')
    op.drop_column('proposals', 'team_dlm_targets')
    op.drop_column('proposals', 'target_dlm')
