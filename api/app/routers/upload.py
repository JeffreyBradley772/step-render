import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from datetime import datetime, timezone
from pydantic import BaseModel

from app.schemas import PresignedUrl, UploadRequest
from app.storage.storage_interface import BlobStorageClient
from app.dependencies.core import DBSessionDep, get_step_file_storage
from app.models.step import StepFile, UploadStatus
from app.services.render import render_step_file
from app.database import sessionmanager

logger = logging.getLogger(__name__)

router = APIRouter(
  prefix="/upload",
  tags=["upload"]
)

class UploadFinishedRequest(BaseModel):
    object_uuid: str

@router.post("/presigned-url", response_model=PresignedUrl)
async def get_presigned_upload_url(
    request: UploadRequest,
    database: DBSessionDep,
    blob_client: BlobStorageClient = Depends(get_step_file_storage)
):
    """Generate a presigned URL for uploading a file to blob storage"""
    object_uuid = str(uuid.uuid4())
    
    # update db record
    step_file = StepFile(
        uuid=object_uuid,
        filename=request.filename,
        file_size=str(request.size) if request.size else None,
        status=UploadStatus.UPLOADING,
    )
    database.add(step_file)
    await database.commit()
    
    # return presigned URL for upload
    presigned_url = blob_client.get_presigned_upload_url(object_uuid)
    
    return presigned_url

async def process_render_task(file_uuid: str):
    """Background task to render STEP file to GLB"""
    async with sessionmanager.session() as db:
        try:
            # Update status to PROCESSING
            result = await db.execute(
                select(StepFile).where(StepFile.uuid == file_uuid)
            )
            step_file = result.scalar_one_or_none()
            if not step_file:
                logger.error(f"File {file_uuid} not found for rendering")
                return
            
            step_file.status = UploadStatus.PROCESSING
            await db.commit()
            
            # do rendering
            render_uuid = str(uuid.uuid4())
            logger.info(f"Starting render for {file_uuid} -> {render_uuid}")
            
            rendered_url, metadata = await render_step_file(file_uuid, render_uuid)
            
            # update database row
            step_file.status = UploadStatus.PROCESSED
            step_file.render_blob_url = rendered_url
            step_file.metadata_json = metadata
            step_file.processed_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"Finished rendering {file_uuid}")
            
        except Exception as e:
            logger.error(f"Error rendering file {file_uuid}: {e}")
            # set status to FAILED
            result = await db.execute(
                select(StepFile).where(StepFile.uuid == file_uuid)
            )
            step_file = result.scalar_one_or_none()
            if step_file:
                step_file.status = UploadStatus.FAILED
                step_file.error_message = str(e)
                await db.commit()


@router.post("/finished")
async def upload_finished(
    request: UploadFinishedRequest,
    background_tasks: BackgroundTasks,
    database: DBSessionDep,
    blob_client: BlobStorageClient = Depends(get_step_file_storage)
):
    """Mark a file as finished uploading and trigger rendering"""
    result = await database.execute(
        select(StepFile).where(StepFile.uuid == request.object_uuid)
    )
    step_file = result.scalar_one_or_none()
    
    if not step_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    step_file.status = UploadStatus.UPLOADED
    step_file.uploaded_at = datetime.now(timezone.utc)
    step_file.blob_url = blob_client.get_object_url(request.object_uuid)
    
    await database.commit()
    
    # start rendering task
    background_tasks.add_task(process_render_task, request.object_uuid)
    
    return {"status": "success", "uuid": request.object_uuid, "file_status": step_file.status}
    
