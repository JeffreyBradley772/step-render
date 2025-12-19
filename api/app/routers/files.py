
from fastapi import APIRouter, HTTPException
from app.schemas import StepFileResponse, RenderDownloadUrlResponse, DeleteFileResponse, ProcessStatusUpdate
from app.models.step import StepFile
from app.dependencies.core import DBSessionDep, RenderBlobClient, StepFileBlobClient
from sqlalchemy import select
from app.cache.redis_client import FileStatusCache
from app.celery_app import celery_app

router = APIRouter(
    prefix="/files",
    tags=["files"]
)

@router.get("/", response_model=list[StepFileResponse])
async def get_files(db: DBSessionDep):
    result = await db.execute(select(StepFile))
    files = result.scalars().all()
    
    return [
        StepFileResponse(
            uuid=file.uuid,
            filename=file.filename,
            file_size=file.file_size,
            blob_url=file.blob_url,
            metadata_json=file.metadata_json,
            error_message=file.error_message,
            status=file.status.value,  # Convert enum to string
            uploaded_at=file.uploaded_at.isoformat() if file.uploaded_at else None,
            processed_at=file.processed_at.isoformat() if file.processed_at else None,
        )
        for file in files
    ]

@router.get("/{uuid}", response_model=StepFileResponse)
async def get_file(uuid: str, db: DBSessionDep):
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return StepFileResponse(
        uuid=file.uuid,
        filename=file.filename,
        file_size=file.file_size,
        blob_url=file.blob_url,
        metadata_json=file.metadata_json,
        error_message=file.error_message,
        status=file.status.value,  # Convert enum to string
        uploaded_at=file.uploaded_at.isoformat() if file.uploaded_at else None,
        processed_at=file.processed_at.isoformat() if file.processed_at else None,
    )

@router.get("/{uuid}/status", response_model=ProcessStatusUpdate)
async def get_file_status(
    uuid: str,
    db: DBSessionDep,
):
    """Get file processing status from Redis."""
    # Check cache
    cached_status = FileStatusCache.get_status(uuid)
    if cached_status:
        task_id = cached_status.task_id
        task_status = None
        task_info = cached_status.metadata.model_dump() if cached_status.metadata else None
        
        # Get live task info if task_id exists
        if task_id:
            task = celery_app.AsyncResult(task_id)
            task_status = task.state
            if task.info:
                task_info = task.info
    
        return ProcessStatusUpdate(
            uuid=uuid,
            status=cached_status.status.value,  
            task_id=task_id,
            task_status=task_status,
            task_info=task_info,
        )
    
    # Check database
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return ProcessStatusUpdate(
        uuid=file.uuid,
        status=file.status.value, 
        task_id=None,
        task_status=None,
        task_info=None,
    )

@router.get("/{uuid}/render-download-url", response_model=RenderDownloadUrlResponse)
async def get_render_download_url(
    uuid: str,
    db: DBSessionDep,
    render_storage: RenderBlobClient,
):
    """Get a presigned download URL for the rendered GLB file"""
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file.status.value != 'processed':
        raise HTTPException(status_code=404, detail="Rendered file not available yet")
    
    # Use step file UUID directly (render file uses same UUID)
    download_url = render_storage.get_presigned_download_url(uuid, expires_in=3600)
    
    return RenderDownloadUrlResponse(download_url=download_url, expires_in=3600)

@router.delete("/{uuid}", response_model=DeleteFileResponse)
async def delete_file(
    uuid: str,
    db: DBSessionDep,
    step_file_storage: StepFileBlobClient,
    render_storage: RenderBlobClient,
    ):
    try:
        result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
        file = result.scalar_one_or_none()
        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        step_file_storage.delete_file(file.uuid)
        # delete rendered GLB file too if it exists
        if file.status.value == 'processed':
            render_storage.delete_file(file.uuid)

        await db.delete(file)
        await db.commit()
        
        return DeleteFileResponse(status="success", message="File deleted successfully", uuid=uuid)
    except Exception as e:
        return DeleteFileResponse(status="error", message=str(e), uuid=uuid)
