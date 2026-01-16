"""Expand tags.color column for color IDs.

Revision ID: 011_expand_tag_color
Revises: 3b9894917ca2
Create Date: 2026-01-09

Previously color was stored as hex (#6B7280, 7 chars).
Now we store color IDs (gray, blue, red, etc.) which need up to 20 chars.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011_expand_tag_color'
down_revision: Union[str, None] = '3b9894917ca2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Expand color column from 7 to 20 chars
    op.alter_column(
        'tags',
        'color',
        type_=sa.String(20),
        existing_type=sa.String(7),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Shrink back to 7 chars (may truncate data)
    op.alter_column(
        'tags',
        'color',
        type_=sa.String(7),
        existing_type=sa.String(20),
        existing_nullable=False,
    )
