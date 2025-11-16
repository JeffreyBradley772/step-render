
from fastapi import APIRouter, HTTPException
from app.schemas import StepFileResponse
from app.models.step import StepFile
from app.dependencies.core import DBSessionDep
from sqlalchemy import select
from app.dependencies.core import get_blob_client

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
        status=file.status.value,  # Convert enum to string
        uploaded_at=file.uploaded_at.isoformat() if file.uploaded_at else None,
        processed_at=file.processed_at.isoformat() if file.processed_at else None,
    )

@router.delete("/{uuid}")
async def delete_file(uuid: str, db: DBSessionDep):
    result = await db.execute(select(StepFile).where(StepFile.uuid == uuid))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    await db.delete(file)
    await db.commit()

    get_blob_client().delete_file(file.uuid)
    return {"message": "File deleted successfully"}
