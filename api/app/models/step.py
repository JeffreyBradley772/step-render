from sqlalchemy import String, JSON, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime, timezone
from typing import Optional
import enum

class Base(DeclarativeBase):
    pass

class UploadStatus(str, enum.Enum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class StepFile(Base):
    __tablename__ = "step_files"
    
    uuid: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    
    filename: Mapped[str]
    file_size: Mapped[Optional[str]]  # in bytes
    
    blob_url: Mapped[Optional[str]]  # URL to access the uploaded STEP file
    render_blob_url: Mapped[Optional[str]]  # URL of the rendered glTF/GLB asset
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON)  # component hierarchy / metadata
    error_message: Mapped[Optional[str]]  # potential error message

    status: Mapped[UploadStatus] = mapped_column(default=UploadStatus.UPLOADING)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))  # upload completed
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))  # processing completed
    
    def __repr__(self) -> str:
        return f"<StepFile(uuid={self.uuid}, filename={self.filename}, status={self.status})>"