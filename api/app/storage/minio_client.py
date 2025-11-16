from datetime import timedelta
from minio import Minio
from .storage_interface import BlobStorageClient
from app.schemas import PresignedUrl

class MinioBlobStorageClient(BlobStorageClient):
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        default_bucket: str,
        secure: bool = False,
    ) -> None:
        self._endpoint = endpoint
        self._default_bucket = default_bucket
        self._secure = secure
        self._minio_client: Minio = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        # Ensure default bucket exists
        self.ensure_bucket(default_bucket)

    def ensure_bucket(self, bucket_name: str) -> None:
        """Ensure a bucket exists, create if it doesn't"""
        if not self._minio_client.bucket_exists(bucket_name):
            self._minio_client.make_bucket(bucket_name)
    
    def get_presigned_upload_url(
        self,
        object_uuid: str,
        bucket_name: str | None = None,
        expires_in: int = 3600
    ) -> PresignedUrl:
        """Get presigned URL for uploading an object"""
        bucket = bucket_name or self._default_bucket
        self.ensure_bucket(bucket)
        
        url = self._minio_client.presigned_put_object(
            bucket_name=bucket,
            object_name=object_uuid,
            expires=timedelta(seconds=expires_in),
        )
        return PresignedUrl(url=url, object_uuid=object_uuid)
    
    def get_object_url(
        self,
        object_uuid: str,
        bucket_name: str | None = None
    ) -> str:
        """Get the public/accessible URL for an object"""
        bucket = bucket_name or self._default_bucket
        protocol = "https" if self._secure else "http"
        return f"{protocol}://{self._endpoint}/{bucket}/{object_uuid}"
    
    def delete_file(
        self,
        object_uuid: str,
        bucket_name: str | None = None
    ) -> None:
        """Delete an object from the blob storage"""
        bucket = bucket_name or self._default_bucket
        self._minio_client.remove_object(bucket_name=bucket, object_name=object_uuid)
    
    def download_file(
        self,
        object_uuid: str,
        local_path: str,
        bucket_name: str | None = None
    ) -> None:
        """Download an object from blob storage to a local file"""
        bucket = bucket_name or self._default_bucket
        self._minio_client.fget_object(
            bucket_name=bucket,
            object_name=object_uuid,
            file_path=local_path
        )
    
    def get_presigned_download_url(
        self,
        object_uuid: str,
        bucket_name: str | None = None,
        expires_in: int = 3600
    ) -> str:
        """Get a presigned URL for downloading an object"""
        bucket = bucket_name or self._default_bucket
        url = self._minio_client.presigned_get_object(
            bucket_name=bucket,
            object_name=object_uuid,
            expires=timedelta(seconds=expires_in),
        )
        return url