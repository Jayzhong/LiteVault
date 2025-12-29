"""add_color_to_tags

Revision ID: 007_add_color_to_tags
Revises: 2faeb1beb78b
Create Date: 2025-12-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_add_color_to_tags'
down_revision: Union[str, None] = '2faeb1beb78b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add color column with default gray
    op.add_column(
        'tags',
        sa.Column('color', sa.String(7), nullable=False, server_default='#6B7280')
    )


def downgrade() -> None:
    op.drop_column('tags', 'color')
