"""add wbs_id FK to scope_sections

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-03-01 00:04:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'a6b7c8d9e0f1'
down_revision = 'f5a6b7c8d9e0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scope_sections',
        sa.Column('wbs_id', UUID(as_uuid=True), sa.ForeignKey('wbs_items.id', ondelete='SET NULL'), nullable=True)
    )


def downgrade():
    op.drop_constraint('scope_sections_wbs_id_fkey', 'scope_sections', type_='foreignkey')
    op.drop_column('scope_sections', 'wbs_id')
