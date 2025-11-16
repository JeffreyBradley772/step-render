from typing import Annotated

from app.database import get_db_session
from app.config import get_settings
from app.storage.storage_interface import BlobStorageClient
from app.storage.minio_client import MinioBlobStorageClient
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

DBSessionDep = Annotated[AsyncSession, Depends(get_db_session)]

_step_blob_client: BlobStorageClient | None = None
_render_blob_client: BlobStorageClient | None = None

def get_blob_client() -> BlobStorageClient:
    """Inject blob storage client, defaults to STEP bucket"""
    return get_step_file_storage()

def get_step_file_storage() -> BlobStorageClient:
    """Get storage client for STEP files"""
    global _step_blob_client
    if _step_blob_client is None:
        settings = get_settings()
        _step_blob_client = MinioBlobStorageClient(
            endpoint=settings.blob_storage_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            default_bucket=settings.minio_step_bucket_name,
        )
    return _step_blob_client

def get_render_storage() -> BlobStorageClient:
    """Get storage client for rendered images"""
    global _render_blob_client
    if _render_blob_client is None:
        settings = get_settings()
        _render_blob_client = MinioBlobStorageClient(
            endpoint=settings.blob_storage_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            default_bucket=settings.minio_render_bucket_name,
        )
    return _render_blob_client