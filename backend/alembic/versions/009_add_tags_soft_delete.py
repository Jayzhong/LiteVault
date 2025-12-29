"""Add soft-delete support to tags table.

Revision ID: 009
Revises: 008_add_item_tags_table
Create Date: 2025-12-29

Adds:
- deleted_at column for soft-delete
- updated_at column for tracking changes
- Partial indexes for filtering active tags
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "009_add_tags_soft_delete"
down_revision = "008_add_item_tags_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add deleted_at column (NULL = active, non-NULL = soft-deleted)
    op.add_column(
        "tags",
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    
    # Add updated_at column with default NOW()
    op.add_column(
        "tags",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    
    # Create partial index for fast filtering of active tags
    op.execute("""
        CREATE INDEX idx_tags_user_active 
        ON tags(user_id) 
        WHERE deleted_at IS NULL
    """)
    
    # Create partial indexes for sorting active tags
    op.execute("""
        CREATE INDEX idx_tags_user_name_asc_active 
        ON tags(user_id, name ASC) 
        WHERE deleted_at IS NULL
    """)
    
    op.execute("""
        CREATE INDEX idx_tags_user_usage_desc_active 
        ON tags(user_id, usage_count DESC) 
        WHERE deleted_at IS NULL
    """)
    
    op.execute("""
        CREATE INDEX idx_tags_user_lastused_desc_active 
        ON tags(user_id, last_used DESC NULLS LAST) 
        WHERE deleted_at IS NULL
    """)


def downgrade() -> None:
    # Drop partial indexes
    op.drop_index("idx_tags_user_lastused_desc_active", table_name="tags")
    op.drop_index("idx_tags_user_usage_desc_active", table_name="tags")
    op.drop_index("idx_tags_user_name_asc_active", table_name="tags")
    op.drop_index("idx_tags_user_active", table_name="tags")
    
    # Drop columns
    op.drop_column("tags", "updated_at")
    op.drop_column("tags", "deleted_at")
