"""add projects and lessons tables

Revision ID: m2c3d4e5f6a7
Revises: l1b2c3d4e5f6
Create Date: 2026-03-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "m2c3d4e5f6a7"
down_revision = "l1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_number", sa.String(), unique=True, nullable=True),
        sa.Column("project_name", sa.String(), nullable=False),
        sa.Column("client", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("contract_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("year_completed", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="completed"),
        sa.Column("wsp_role", sa.String(), nullable=True),
        sa.Column("project_manager", sa.String(), nullable=True),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("services_performed", sa.Text(), nullable=True),
        sa.Column("key_personnel", JSONB(), server_default="[]", nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("outcomes", sa.Text(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )

    op.create_table(
        "lessons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("impact", sa.String(), nullable=False, server_default="medium"),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("disciplines", JSONB(), server_default="[]", nullable=True),
        sa.Column("client", sa.String(), nullable=True),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("proposal_id", UUID(as_uuid=True), sa.ForeignKey("proposals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reported_by", sa.String(), nullable=True),
        sa.Column("date_reported", sa.Date(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )

    op.create_index("ix_lessons_project_id", "lessons", ["project_id"])
    op.create_index("ix_lessons_proposal_id", "lessons", ["proposal_id"])

    op.add_column(
        "relevant_projects",
        sa.Column("source_project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade():
    op.drop_column("relevant_projects", "source_project_id")
    op.drop_index("ix_lessons_proposal_id", table_name="lessons")
    op.drop_index("ix_lessons_project_id", table_name="lessons")
    op.drop_table("lessons")
    op.drop_table("projects")
