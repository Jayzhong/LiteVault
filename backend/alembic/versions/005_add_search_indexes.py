"""Add pg_trgm extension and search indexes

Revision ID: 005_add_search_indexes
Revises: 004_add_tags_table
Create Date: 2025-12-28
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "005_add_search_indexes"
down_revision = "004_add_tags_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pg_trgm extension for fast ILIKE search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    
    # Create trigram indexes for search on items table
    # These enable fast pattern matching with ILIKE '%term%'
    op.execute(
        "CREATE INDEX idx_items_title_trgm ON items USING GIN (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX idx_items_summary_trgm ON items USING GIN (summary gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX idx_items_raw_text_trgm ON items USING GIN (raw_text gin_trgm_ops)"
    )


def downgrade() -> None:
    # Remove trigram indexes
    op.execute("DROP INDEX IF EXISTS idx_items_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_items_summary_trgm")
    op.execute("DROP INDEX IF EXISTS idx_items_raw_text_trgm")
    
    # Note: We don't drop pg_trgm extension as other parts might depend on it
