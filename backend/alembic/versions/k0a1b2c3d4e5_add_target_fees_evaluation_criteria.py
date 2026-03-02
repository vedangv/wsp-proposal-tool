"""add target_fees and evaluation_criteria to proposals

Revision ID: k0a1b2c3d4e5
Revises: j9d0e1f2g3h4
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "k0a1b2c3d4e5"
down_revision = "j9d0e1f2g3h4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("proposals", sa.Column("target_fees", JSONB, server_default="[]"))
    op.add_column("proposals", sa.Column("evaluation_criteria", JSONB, server_default="[]"))


def downgrade():
    op.drop_column("proposals", "evaluation_criteria")
    op.drop_column("proposals", "target_fees")
