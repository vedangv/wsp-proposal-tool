"""refactor pricing_rows: add person_id FK, drop role_title/staff_name/grade

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-02-28 00:01:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'c2d3e4f5a6b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('pricing_rows',
        sa.Column('person_id', UUID(as_uuid=True), sa.ForeignKey('proposed_people.id', ondelete='SET NULL'), nullable=True)
    )
    op.drop_column('pricing_rows', 'role_title')
    op.drop_column('pricing_rows', 'staff_name')
    op.drop_column('pricing_rows', 'grade')


def downgrade():
    op.add_column('pricing_rows', sa.Column('grade', sa.String(), nullable=True))
    op.add_column('pricing_rows', sa.Column('staff_name', sa.String(), nullable=True))
    op.add_column('pricing_rows', sa.Column('role_title', sa.String(), nullable=True))
    op.drop_constraint('pricing_rows_person_id_fkey', 'pricing_rows', type_='foreignkey')
    op.drop_column('pricing_rows', 'person_id')
