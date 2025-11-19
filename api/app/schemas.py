from pydantic import BaseModel

class PresignedUrl(BaseModel):
    url: str
    object_uuid: str

class UploadRequest(BaseModel):
    filename: str
    content_type: str | None = None
    size: int | None = None

class StepFileResponse(BaseModel):
    uuid: str
    filename: str
    file_size: int | None = None
    blob_url: str | None = None
    render_blob_url: str | None = None
    metadata_json: dict | None = None
    error_message: str | None = None
    status: str
    uploaded_at: str | None = None
    processed_at: str | None = None

class RenderDownloadUrlResponse(BaseModel):
    download_url: str
    expires_in: int

class UploadFinishedResponse(BaseModel):
    status: str
    uuid: str
    file_status: str

class DeleteFileResponse(BaseModel):
    status: str
    message: str
    uuid: str