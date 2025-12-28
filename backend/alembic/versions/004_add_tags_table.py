"""Add tags table.

Revision ID: 004_add_tags_table
Revises: 003_add_profile_fields
Create Date: 2025-12-28
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '004_add_tags_table'
down_revision = '003_add_profile_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tags table (using String(36) to match users.id)
    op.create_table(
        'tags',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('name_lower', sa.String(50), nullable=False),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes
    op.create_index(
        'idx_tags_user_name_lower',
        'tags',
        ['user_id', 'name_lower'],
        unique=True,
    )
    op.create_index('idx_tags_user_id', 'tags', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_tags_user_id', table_name='tags')
    op.drop_index('idx_tags_user_name_lower', table_name='tags')
    op.drop_table('tags')
