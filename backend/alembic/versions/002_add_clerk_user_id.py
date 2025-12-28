"""Add clerk_user_id to users table

Revision ID: 002_add_clerk_user_id
Revises: 001_initial_schema
Create Date: 2025-12-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_clerk_user_id'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add clerk_user_id column (nullable initially for existing rows)
    op.add_column(
        'users',
        sa.Column('clerk_user_id', sa.String(255), nullable=True)
    )
    
    # Create unique index on clerk_user_id
    op.create_index(
        'idx_users_clerk_user_id',
        'users',
        ['clerk_user_id'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index('idx_users_clerk_user_id', table_name='users')
    op.drop_column('users', 'clerk_user_id')
