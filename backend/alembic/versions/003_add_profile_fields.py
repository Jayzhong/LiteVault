"""Add profile fields to users table

Revision ID: 003_add_profile_fields
Revises: 002_add_clerk_user_id
Create Date: 2025-12-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '003_add_profile_fields'
down_revision: Union[str, None] = '002_add_clerk_user_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nickname column (app-owned, separate from Clerk display_name)
    op.add_column(
        'users',
        sa.Column('nickname', sa.String(40), nullable=True)
    )
    
    # Add bio column
    op.add_column(
        'users',
        sa.Column('bio', sa.String(200), nullable=True)
    )
    
    # Add preferences_json column (JSONB for flexible preference storage)
    op.add_column(
        'users',
        sa.Column(
            'preferences_json',
            JSONB,
            nullable=False,
            server_default='{}'
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'preferences_json')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'nickname')
