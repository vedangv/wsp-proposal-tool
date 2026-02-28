"""add relevant_projects table

Revision ID: a1b2c3d4e5f6
Revises: f4ea06bc1db5
Create Date: 2026-02-27 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f4ea06bc1db5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'relevant_projects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('proposal_id', sa.UUID(), nullable=False),
        sa.Column('project_name', sa.String(), nullable=False),
        sa.Column('project_number', sa.String(), nullable=True),
        sa.Column('client', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('contract_value', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('year_completed', sa.String(), nullable=True),
        sa.Column('wsp_role', sa.String(), nullable=True),
        sa.Column('project_manager', sa.String(), nullable=True),
        sa.Column('services_performed', sa.Text(), nullable=True),
        sa.Column('relevance_notes', sa.Text(), nullable=True),
        sa.Column('updated_by', sa.UUID(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_relevant_projects_proposal_id', 'relevant_projects', ['proposal_id'])


def downgrade() -> None:
    op.drop_index('ix_relevant_projects_proposal_id', table_name='relevant_projects')
    op.drop_table('relevant_projects')
