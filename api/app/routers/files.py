
from fastapi import APIRouter, HTTPException
from app.schemas import StepFileResponse, RenderDownloadUrlResponse
from app.models.step import StepFile
from app.dependencies.core import DBSessionDep, get_render_storage
from sqlalchemy import select
from app.dependencies.core import get_blob_client
from pydantic import BaseModel

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
            render_blob_url=file.render_blob_url,
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
        render_blob_url=file.render_blob_url,
        metadata_json=file.metadata_json,
        error_message=file.error_message,
        status=file.status.value,  # Convert enum to string
        uploaded_at=file.uploaded_at.isoformat() if file.uploaded_at else None,
        processed_at=file.processed_at.isoformat() if file.processed_at else None,
    )

@router.get("/{uuid}/render-download-url", response_model=RenderDownloadUrlResponse)
async def get_render_download_url(uuid: str, db: DBSessionDep):
    """Get a presigned download URL for the rendered GLB file"""
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not file.render_blob_url:
        raise HTTPException(status_code=404, detail="Rendered file not available yet")
    
    # get render UUID from the render_blob_url
    # example: http://localhost:9000/renders/{render_uuid}
    render_uuid = file.render_blob_url.split('/')[-1]
    
    render_storage = get_render_storage()
    download_url = render_storage.get_presigned_download_url(render_uuid, expires_in=3600)
    
    return RenderDownloadUrlResponse(download_url=download_url, expires_in=3600)

@router.delete("/{uuid}")
async def delete_file(uuid: str, db: DBSessionDep):
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    await db.delete(file)
    await db.commit()

    get_blob_client().delete_file(file.uuid)
    
    # delete rendered GLB file too if it exists
    if file.render_blob_url:
        render_uuid = file.render_blob_url.split('/')[-1]
        render_storage = get_render_storage()
        render_storage.delete_file(render_uuid)
    
    return {"message": "File deleted successfully"}
