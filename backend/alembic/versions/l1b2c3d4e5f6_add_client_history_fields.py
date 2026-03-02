"""add client history fields and client_outreach table

Revision ID: l1b2c3d4e5f6
Revises: k0a1b2c3d4e5
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa

revision = "l1b2c3d4e5f6"
down_revision = "k0a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("proposals", sa.Column("debrief_notes", sa.Text(), nullable=True))
    op.add_column("proposals", sa.Column("client_feedback", sa.Text(), nullable=True))

    op.create_table(
        "client_outreach",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("proposal_id", sa.UUID(), nullable=False),
        sa.Column("outreach_date", sa.Date(), nullable=False),
        sa.Column("outreach_type", sa.String(), nullable=False),
        sa.Column("contact_name", sa.String(), nullable=True),
        sa.Column("contact_role", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["proposal_id"], ["proposals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_outreach_proposal_id", "client_outreach", ["proposal_id"])


def downgrade():
    op.drop_index("ix_client_outreach_proposal_id", table_name="client_outreach")
    op.drop_table("client_outreach")
    op.drop_column("proposals", "client_feedback")
    op.drop_column("proposals", "debrief_notes")
