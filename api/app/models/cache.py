from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum

class TaskStatus(str, Enum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class TaskMetadata(BaseModel):
    """Metadata stored in cache"""
    progress: Optional[int] = Field(None, ge=0, le=100)
    message: Optional[str] = None
    render_url: Optional[str] = None
    error: Optional[str] = None

    def to_json(self) -> str:
        return self.model_dump_json()
    
    class Config:
        extra = "allow"  # Allow additional fields

class FileStatusData(BaseModel):
    """Type-safe file status cache structure"""
    status: TaskStatus
    task_id: Optional[str] = None
    metadata: TaskMetadata = Field(default_factory=TaskMetadata)
    
    def to_json(self) -> str:
        """Serialize to JSON for Redis"""
        return self.model_dump_json()
    
    @classmethod
    def from_json(cls, data: str) -> "FileStatusData":
        """Deserialize from JSON"""
        return cls.model_validate_json(data)