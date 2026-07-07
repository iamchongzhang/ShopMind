"""Create the default admin user (admin / 123456).

Usage:
    cd backend
    python -m scripts.seed_admin
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import async_session_factory, init_db
from app.core.security import hash_password


async def seed_admin():
    """Create the admin user if it does not already exist."""
    # Ensure tables exist
    await init_db()

    from app.models.user import User

    async with async_session_factory() as db:  # type: AsyncSession
        result = await db.execute(
            select(User).where(User.username == settings.admin_username)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user '{settings.admin_username}' already exists — skipping.")
            return

        admin = User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            email="admin@shopmind.local",
        )
        db.add(admin)
        await db.commit()
        print(f"Admin user '{settings.admin_username}' created with password '{settings.admin_password}'.")
        print("IMPORTANT: Change the default password after first login!")


if __name__ == "__main__":
    asyncio.run(seed_admin())
