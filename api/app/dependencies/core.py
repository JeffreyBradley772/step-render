from typing import Annotated

from app.database import get_db_session
from app.config import get_settings
from app.storage.storage_interface import BlobStorageClient
from app.storage.minio_client import MinioBlobStorageClient
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

DBSessionDep = Annotated[AsyncSession, Depends(get_db_session)]

_blob_client: BlobStorageClient | None = None

def get_blob_client() -> BlobStorageClient:
    """Inject blob storage client"""
    global _blob_client
    if _blob_client is None:
        settings = get_settings()
        # here: programmatically swap out for prod
        _blob_client = MinioBlobStorageClient(
            endpoint=settings.blob_storage_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            default_bucket=settings.minio_step_bucket_name,
        )
    return _blob_client