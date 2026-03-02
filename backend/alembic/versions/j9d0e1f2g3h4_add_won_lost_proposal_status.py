"""add won and lost proposal status

Revision ID: j9d0e1f2g3h4
Revises: i8c9d0e1f2g3
Create Date: 2026-03-01
"""
from alembic import op

revision = "j9d0e1f2g3h4"
down_revision = "i8c9d0e1f2g3"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE proposalstatus ADD VALUE IF NOT EXISTS 'won'")
    op.execute("ALTER TYPE proposalstatus ADD VALUE IF NOT EXISTS 'lost'")


def downgrade():
    pass  # PostgreSQL does not support removing enum values
