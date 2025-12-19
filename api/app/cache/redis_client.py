import os
import json
from app.models.cache import FileStatusData, TaskMetadata, TaskStatus
import redis
from typing import Optional, Dict, Any
from datetime import timedelta

REDIS_DATA_URL = os.getenv("REDIS_DATA_URL", "redis://localhost:6379/0")

redis_client = redis.from_url(REDIS_DATA_URL, decode_responses=True)

class FileStatusCache:

  PREFIX = "file_status:"
  TASK_PREFIX = "task_id:"
  TTL = 3600 # 1 hour

  @classmethod
  def get_key(cls, file_uuid: str) -> str:
    return f"{cls.PREFIX}{file_uuid}"

  @classmethod
  def get_task_key(cls, task_id: str) -> str:
    return f"{cls.TASK_PREFIX}{task_id}"

  @classmethod
  def set_status(cls, 
    file_uuid: str, 
    status: TaskStatus, 
    task_id: Optional[str] = None, 
    metadata: Optional[TaskMetadata] = None) -> None:
    """
      Cache file processing status in Redis.
      
      Args:
        file_uuid: UUID of the file
        status: Current status (uploading, uploaded, processing, processed, failed)
        task_id: Celery task ID if applicable
        metadata: Additional metadata to cache
    """

    data = FileStatusData(
      status=status,
      task_id=task_id,
      metadata=metadata or TaskMetadata()
    )

    key = cls.get_key(file_uuid)
    redis_client.setex(key, cls.TTL, data.to_json())

    if task_id:
      task_key = cls.get_task_key(task_id)
      redis_client.setex(task_key, cls.TTL, data.to_json())
  
  @classmethod
  def get_status(cls, file_uuid: str) -> Optional[FileStatusData]:
    """
      Get file processing status from Redis.
        
      Args:
        file_uuid: UUID of the file
        
      Returns:
        Dictionary containing status, task_id, and metadata if found, None otherwise
    """
    key = cls.get_key(file_uuid)
    data = redis_client.get(key)
    if data:
      return FileStatusData.from_json(data)
    return None
    

  @classmethod
  def get_task_id(cls, file_uuid: str) -> Optional[str]:
    """
      Get Celery task ID from Redis.
        
      Args:
        file_uuid: UUID of the file
        
      Returns:
        Celery task ID if found, None otherwise
    """
    key = cls.get_task_key(file_uuid)
    data = redis_client.get(key)
    if data:
      return FileStatusData.from_json(data).task_id
    return None

  @classmethod
  def delete_status(cls, file_uuid: str) -> None:
    """Delete file processing status from Redis."""
    key = cls.get_key(file_uuid)
    redis_client.delete(key)
    task_key = cls.get_task_key(file_uuid)
    redis_client.delete(task_key)
  
  @classmethod
  def update_progress(cls, file_uuid: str, progress: int, message: str) -> None:
    """Update progress in redis cache"""
    cached = cls.get_status(file_uuid)

    if cached:
      cached.metadata.progress = progress
      cached.metadata.message = message
      key = cls.get_key(file_uuid)
      redis_client.setex(key, cls.TTL, cached.to_json())
