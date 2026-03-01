"""add cost_rate to pricing_rows

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-03-01 00:02:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e4f5a6b7c8d9'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('pricing_rows',
        sa.Column('cost_rate', sa.Numeric(10, 2), nullable=True, server_default='0')
    )


def downgrade():
    op.drop_column('pricing_rows', 'cost_rate')
