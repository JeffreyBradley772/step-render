from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    name: str = "Step Render API"
    # sql
    sql_database_url: str
    
    # blob
    blob_storage_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_step_bucket_name: str
    minio_render_bucket_name: str
    
    class Config:
        env_file = ".env.development" # programatically change?
        case_sensitive = False
        extra = 'ignore' # allow extra env variables for now

@lru_cache
def get_settings() -> Settings:
    return Settings()
