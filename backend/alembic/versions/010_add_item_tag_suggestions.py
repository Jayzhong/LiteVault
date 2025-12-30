"""Add item_tag_suggestions table.

Revision ID: 010
Revises: 2faeb1beb78b
Create Date: 2025-12-30
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "010_add_item_tag_suggestions"
down_revision: Union[str, None] = "009_add_tags_soft_delete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create item_tag_suggestions table for AI-generated tag suggestions."""
    op.create_table(
        "item_tag_suggestions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.String(36),
            sa.ForeignKey("items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source", sa.String(20), nullable=False, server_default="AI"),
        sa.Column("suggested_name", sa.String(50), nullable=False),
        sa.Column("normalized_name", sa.String(50), nullable=False),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", JSONB, nullable=False, server_default="{}"),
        # Unique constraint: one suggestion per tag name per item
        sa.UniqueConstraint("user_id", "item_id", "normalized_name", name="uq_suggestion_per_item_tag"),
    )

    # Index for loading suggestions by item
    op.create_index(
        "idx_suggestions_item",
        "item_tag_suggestions",
        ["item_id"],
    )

    # Index for user's pending suggestions
    op.create_index(
        "idx_suggestions_user_pending",
        "item_tag_suggestions",
        ["user_id"],
        postgresql_where="status = 'PENDING'",
    )


def downgrade() -> None:
    """Drop item_tag_suggestions table."""
    op.drop_index("idx_suggestions_user_pending", table_name="item_tag_suggestions")
    op.drop_index("idx_suggestions_item", table_name="item_tag_suggestions")
    op.drop_table("item_tag_suggestions")
