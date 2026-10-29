"""Alembic migration environment"""
import sys
import os
from logging.config import fileConfig

# 👇 ADD THIS LINE: Tells Python to look in the backend folder for the 'app' module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Now this will work:
from app.config import settings 
from app.database import Base
from app import models  

# ... (the rest of your env.py stays exactly the same) ...
config = context.config

# 3. Inject the DB URL from your .env file
# We use .replace('%', '%%') in case your password has a '%' in it
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace('%', '%%'))

# 4. Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 5. Define target metadata for 'autogenerate'
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()