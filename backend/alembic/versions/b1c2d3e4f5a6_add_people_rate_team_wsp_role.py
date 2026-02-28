"""add hourly_rate team wsp_role to proposed_people

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-02-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b1c2d3e4f5a6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('proposed_people', sa.Column('wsp_role', sa.String(), nullable=True))
    op.add_column('proposed_people', sa.Column('team', sa.String(), nullable=True))
    op.add_column('proposed_people', sa.Column('hourly_rate', sa.Numeric(10, 2), nullable=True, server_default='0'))


def downgrade():
    op.drop_column('proposed_people', 'hourly_rate')
    op.drop_column('proposed_people', 'team')
    op.drop_column('proposed_people', 'wsp_role')
