"""Add item_tags junction table.

Revision ID: 008_add_item_tags_table
Revises: 007_add_color_to_tags
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "008_add_item_tags_table"
down_revision = "007_add_color_to_tags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create item_tags junction table."""
    op.create_table(
        "item_tags",
        sa.Column("item_id", sa.String(36), sa.ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.String(36), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Index for reverse lookup (tag -> items)
    op.create_index("idx_item_tags_tag_id", "item_tags", ["tag_id"])


def downgrade() -> None:
    """Drop item_tags table."""
    op.drop_index("idx_item_tags_tag_id", table_name="item_tags")
    op.drop_table("item_tags")
