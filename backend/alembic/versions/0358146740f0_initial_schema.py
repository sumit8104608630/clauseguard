"""initial schema

Revision ID: 0358146740f0
Revises:
Create Date: 2026-10-29

Rebuilt from the live ClauseGuard database schema after the original migration
files were lost. The revision id matches the value already stamped in the
`alembic_version` table, so `alembic upgrade head` is a no-op on the existing
database and reproduces the exact same schema on a fresh one.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0358146740f0'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users -------------------------------------------------------------
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id', name='users_pkey'),
        sa.UniqueConstraint('email', name='users_email_key'),
    )

    # --- contracts ---------------------------------------------------------
    op.create_table(
        'contracts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('cloudinary_public_id', sa.String(), nullable=False),
        sa.Column('cloudinary_url', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column(
            'status',
            postgresql.ENUM(
                'uploaded',
                'processing',
                'analyzed',
                'failed',
                'processed',
                'analyzing',
                name='contractstatus',
            ),
            nullable=False,
        ),
        sa.Column(
            'uploaded_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('analyzed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name='contracts_user_id_fkey',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='contracts_pkey'),
    )
    op.create_index('ix_contracts_user_id', 'contracts', ['user_id'])

    # --- clauses -----------------------------------------------------------
    op.create_table(
        'clauses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('section_label', sa.String(), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('chroma_id', sa.String(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ['contract_id'],
            ['contracts.id'],
            name='clauses_contract_id_fkey',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='clauses_pkey'),
        sa.UniqueConstraint('chroma_id', name='clauses_chroma_id_key'),
    )
    op.create_index('ix_clauses_contract_id', 'clauses', ['contract_id'])

    # --- risk_results ------------------------------------------------------
    op.create_table(
        'risk_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('clause_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column(
            'risk_level',
            postgresql.ENUM(
                'high', 'medium', 'low', 'none', name='risklevel'
            ),
            nullable=False,
        ),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('suggested_fix', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['clause_id'],
            ['clauses.id'],
            name='risk_results_clause_id_fkey',
            ondelete='SET NULL',
        ),
        sa.ForeignKeyConstraint(
            ['contract_id'],
            ['contracts.id'],
            name='risk_results_contract_id_fkey',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='risk_results_pkey'),
    )
    op.create_index('ix_risk_results_contract_id', 'risk_results', ['contract_id'])
    op.create_index('ix_risk_results_risk_level', 'risk_results', ['risk_level'])

    # --- chat_messages -----------------------------------------------------
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'role',
            postgresql.ENUM('user', 'assistant', name='messagerole'),
            nullable=False,
        ),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column(
            'cited_clause_ids',
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['contract_id'],
            ['contracts.id'],
            name='chat_messages_contract_id_fkey',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name='chat_messages_user_id_fkey',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='chat_messages_pkey'),
    )
    op.create_index(
        'ix_chat_messages_contract_id', 'chat_messages', ['contract_id']
    )


def downgrade() -> None:
    op.drop_index('ix_chat_messages_contract_id', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.execute('DROP TYPE IF EXISTS messagerole')

    op.drop_index('ix_risk_results_risk_level', table_name='risk_results')
    op.drop_index('ix_risk_results_contract_id', table_name='risk_results')
    op.drop_table('risk_results')
    op.execute('DROP TYPE IF EXISTS risklevel')

    op.drop_index('ix_clauses_contract_id', table_name='clauses')
    op.drop_table('clauses')

    op.drop_index('ix_contracts_user_id', table_name='contracts')
    op.drop_table('contracts')
    op.execute('DROP TYPE IF EXISTS contractstatus')

    op.drop_table('users')
