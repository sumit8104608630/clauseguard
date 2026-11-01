"""add cancelled status to contract

Revision ID: 87eff425fbec
Revises: 812c1ac3e745
Create Date: 2026-11-01 17:36:51.911423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87eff425fbec'
down_revision: Union[str, None] = '812c1ac3e745'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres Enums are not automatically updated by Alembic autogenerate.
    # We must add the new value manually.
    # 'COMMIT' is required because ALTER TYPE ... ADD VALUE cannot run inside a transaction block in some PG versions.
    op.execute("COMMIT")
    op.execute("ALTER TYPE contractstatus ADD VALUE 'cancelled'")


def downgrade() -> None:
    # Note: Removing a value from an Enum in Postgres is not straightforwardly supported.
    # Usually requires recreating the type, which is dangerous for production data.
    pass
