"""add google auth fields to users

Revision ID: 812c1ac3e745
Revises: 0358146740f0
Create Date: 2026-10-30 18:18:25.414939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '812c1ac3e745'
down_revision: Union[str, None] = '0358146740f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Google-only accounts have no local password.
    op.alter_column(
        'users',
        'password',
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.add_column(
        'users',
        sa.Column('google_id', sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint('users_google_id_key', 'users', ['google_id'])


def downgrade() -> None:
    op.drop_constraint('users_google_id_key', 'users', type_='unique')
    op.drop_column('users', 'google_id')
    # NOTE: fails if any password-less (Google-only) accounts still exist.
    op.alter_column(
        'users',
        'password',
        existing_type=sa.String(length=255),
        nullable=False,
    )
