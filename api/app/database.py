import contextlib
from typing import Any, AsyncIterator

from app.config import get_settings
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

settings = get_settings()

class DatabaseSessionManager:
    def __init__(self, host: str):
        self._engine = create_async_engine(host, echo=True) # echos sql queries, set to False in production
        self._sessionmaker = async_sessionmaker(
            autocommit=False,
            bind=self._engine,
            expire_on_commit=False
        )

    async def close(self):
        if self._engine is None:
            raise Exception("DatabaseSessionManager is not initialized")
        await self._engine.dispose()

        self._engine = None
        self._sessionmaker = None

    @contextlib.asynccontextmanager
    async def connect(self) -> AsyncIterator[AsyncConnection]:
        if self._engine is None:
            raise Exception("DatabaseSessionManager is not initialized")

        async with self._engine.begin() as connection:
            try:
                yield connection
            except Exception:
                await connection.rollback()
                raise

    @contextlib.asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        if self._sessionmaker is None:
            raise Exception("DatabaseSessionManager is not initialized")

        session = self._sessionmaker()
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    # no migrations, just create tables
    async def create_all(self):
        from app.models.step import Base
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # dev helper method to drop tables
    async def drop_all(self):
        from app.models.step import Base
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


# initialize
sessionmanager = DatabaseSessionManager(
    settings.sql_database_url.replace("postgresql://", "postgresql+asyncpg://") # here: change in .env
)


async def get_db_session():
    """Dependency to get database session"""
    async with sessionmanager.session() as session:
        yield session