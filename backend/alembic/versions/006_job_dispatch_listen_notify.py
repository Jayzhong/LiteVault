"""Add LISTEN/NOTIFY support to enrichment_outbox.

Revision ID: 006_job_dispatch_listen_notify
Revises: 005_add_search_indexes
Create Date: 2025-12-29

Adds columns for:
- job_type: extensible job type (default 'enrichment')
- run_at: when job becomes runnable (for backoff scheduling)
- locked_by: worker ID holding claim
- lease_expires_at: claim expiry for crash recovery
- last_error_code: structured error code
- Renames last_error to last_error_message

Updates indexes for:
- Runnable jobs (status=PENDING, run_at due)
- Expired leases for reclaim
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "006_job_dispatch_listen_notify"
down_revision = "005_add_search_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to enrichment_outbox
    op.add_column(
        "enrichment_outbox",
        sa.Column("job_type", sa.String(50), nullable=False, server_default="enrichment"),
    )
    op.add_column(
        "enrichment_outbox",
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "enrichment_outbox",
        sa.Column("locked_by", sa.String(100), nullable=True),
    )
    op.add_column(
        "enrichment_outbox",
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "enrichment_outbox",
        sa.Column("last_error_code", sa.String(50), nullable=True),
    )
    
    # Rename last_error to last_error_message
    op.alter_column("enrichment_outbox", "last_error", new_column_name="last_error_message")
    
    # Update status enum values (PROCESSING -> IN_PROGRESS, COMPLETED -> DONE, add DEAD)
    # Note: PostgreSQL requires explicit cast for enum changes, but we're using VARCHAR
    # so we can update values directly
    op.execute("""
        UPDATE enrichment_outbox 
        SET status = 'IN_PROGRESS' 
        WHERE status = 'PROCESSING'
    """)
    op.execute("""
        UPDATE enrichment_outbox 
        SET status = 'DONE' 
        WHERE status = 'COMPLETED'
    """)
    
    # Drop old indexes (IF EXISTS - they may not exist in all environments)
    op.execute("DROP INDEX IF EXISTS idx_outbox_pending")
    op.execute("DROP INDEX IF EXISTS idx_outbox_claimed")
    
    # Create new indexes for LISTEN/NOTIFY pattern
    op.create_index(
        "idx_outbox_runnable",
        "enrichment_outbox",
        ["run_at", "created_at"],
        postgresql_where="status = 'PENDING'",
    )
    op.create_index(
        "idx_outbox_expired_lease",
        "enrichment_outbox",
        ["lease_expires_at"],
        postgresql_where="status = 'IN_PROGRESS' AND lease_expires_at IS NOT NULL",
    )


def downgrade() -> None:
    # Drop new indexes
    op.drop_index("idx_outbox_runnable", table_name="enrichment_outbox")
    op.drop_index("idx_outbox_expired_lease", table_name="enrichment_outbox")
    
    # Recreate old indexes
    op.create_index(
        "idx_outbox_pending",
        "enrichment_outbox",
        ["created_at"],
        postgresql_where="status = 'PENDING' AND claimed_at IS NULL",
    )
    op.create_index(
        "idx_outbox_claimed",
        "enrichment_outbox",
        ["claimed_at"],
        postgresql_where="status = 'PROCESSING'",
    )
    
    # Revert status values
    op.execute("""
        UPDATE enrichment_outbox 
        SET status = 'PROCESSING' 
        WHERE status = 'IN_PROGRESS'
    """)
    op.execute("""
        UPDATE enrichment_outbox 
        SET status = 'COMPLETED' 
        WHERE status = 'DONE'
    """)
    # Note: DEAD status rows would need manual handling
    
    # Rename last_error_message back to last_error
    op.alter_column("enrichment_outbox", "last_error_message", new_column_name="last_error")
    
    # Drop new columns
    op.drop_column("enrichment_outbox", "last_error_code")
    op.drop_column("enrichment_outbox", "lease_expires_at")
    op.drop_column("enrichment_outbox", "locked_by")
    op.drop_column("enrichment_outbox", "run_at")
    op.drop_column("enrichment_outbox", "job_type")
