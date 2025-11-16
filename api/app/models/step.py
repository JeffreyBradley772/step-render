from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone
import enum

Base = declarative_base()

class UploadStatus(str, enum.Enum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class StepFile(Base):
    __tablename__ = "step_files"
    uuid = Column(String(36), primary_key=True, index=True)
    
    filename = Column(String, nullable=False)
    file_size = Column(String, nullable=True)  # in bytes
    
    blob_url = Column(String, nullable=True)  # URL to access the uploaded STEP file
    render_blob_url = Column(String, nullable=True)  # URL of the rendered glTF/GLB asset
    metadata_json = Column(JSON, nullable=True)  # component hierarchy / metadata
    error_message = Column(String, nullable=True)  # potential error message

    status = Column(SQLEnum(UploadStatus), default=UploadStatus.UPLOADING, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=True)  # upload completed
    processed_at = Column(DateTime(timezone=True), nullable=True)  # processing completed
    
    def __repr__(self):
        return f"<StepFile(uuid={self.uuid}, filename={self.filename}, status={self.status})>"