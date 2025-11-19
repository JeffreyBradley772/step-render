import uuid
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from sqlalchemy import select
from datetime import datetime, timezone
from pydantic import BaseModel

from app.schemas import PresignedUrl, UploadRequest, UploadFinishedResponse
from app.storage.storage_interface import BlobStorageClient
from app.dependencies.core import DBSessionDep, StepFileBlobClient 
from app.models.step import StepFile, UploadStatus
from app.services.render import process_render_task

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
    step_file_blob_client: StepFileBlobClient
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
    presigned_url = step_file_blob_client.get_presigned_upload_url(object_uuid)
    
    return presigned_url

@router.post("/finished", response_model=UploadFinishedResponse)
async def upload_finished(
    request: UploadFinishedRequest,
    background_tasks: BackgroundTasks,
    database: DBSessionDep,
    step_file_blob_client: StepFileBlobClient
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
    step_file.blob_url = step_file_blob_client.get_object_url(request.object_uuid)
    
    await database.commit()
    
    # start rendering task
    background_tasks.add_task(process_render_task, request.object_uuid)
    
    return UploadFinishedResponse(
        status="success",
        uuid=request.object_uuid,
        file_status=step_file.status
    )
    
