from abc import ABC, abstractmethod
from app.schemas import PresignedUrl

class BlobStorageClient(ABC):
    """Blob Storage Interface for easy swap of blob storage providers"""
    
    @abstractmethod
    def get_presigned_upload_url(
        self,
        object_uuid: str,
        bucket_name: str | None = None,
        expires_in: int = 3600
    ) -> PresignedUrl:
        pass
    
    @abstractmethod
    def get_object_url(
        self,
        object_uuid: str,
        bucket_name: str | None = None
    ) -> str:
        pass
    
    @abstractmethod
    def ensure_bucket(self, bucket_name: str) -> None:
        """Ensure a bucket exists, create if it doesn't"""
        pass

    @abstractmethod
    def delete_file(self, object_uuid: str, bucket_name: str | None = None) -> None:
        """Delete an object from the blob storage"""
        pass
    