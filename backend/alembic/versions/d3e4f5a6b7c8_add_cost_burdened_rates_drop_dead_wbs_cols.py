"""add cost_rate/burdened_rate to proposed_people; drop dead hours/unit_rate from wbs_items

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-03-01 00:01:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd3e4f5a6b7c8'
down_revision = 'c2d3e4f5a6b7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('proposed_people',
        sa.Column('cost_rate', sa.Numeric(10, 2), nullable=True, server_default='0')
    )
    op.add_column('proposed_people',
        sa.Column('burdened_rate', sa.Numeric(10, 2), nullable=True, server_default='0')
    )
    op.drop_column('wbs_items', 'hours')
    op.drop_column('wbs_items', 'unit_rate')


def downgrade():
    op.add_column('wbs_items', sa.Column('unit_rate', sa.Numeric(10, 2), server_default='0'))
    op.add_column('wbs_items', sa.Column('hours', sa.Numeric(10, 2), server_default='0'))
    op.drop_column('proposed_people', 'burdened_rate')
    op.drop_column('proposed_people', 'cost_rate')
