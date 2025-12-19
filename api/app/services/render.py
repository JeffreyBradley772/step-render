"""
Render service for processing STEP files and converting to glTF/GLB format.

Uses cascadio (OpenCASCADE) to convert STEP files to GLB for Three.js rendering.
"""
import os
import tempfile
import json
import logging
import uuid
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timezone
from app.celery_app import celery_app
from app.cache.redis_client import FileStatusCache
from app.models.cache import TaskStatus, TaskMetadata
import pygltflib
import cascadio
import requests
from sqlalchemy import select

from app.dependencies.core import get_step_file_storage, get_render_storage
from app.storage.storage_interface import BlobStorageClient
from app.database import sessionmanager
from app.models.step import StepFile, UploadStatus

logger = logging.getLogger(__name__)


def extract_gltf_metadata(glb_path: str) -> Dict[str, Any]:
    """
    Extract component hierarchy and metadata from GLB file.
    
    Args:
        glb_path: Path to the GLB file
        
    Returns:
        Dictionary containing component hierarchy and metadata
    """
    try:
        gltf = pygltflib.GLTF2().load(glb_path)
        
        metadata = {
            "nodes": [],
            "meshes_count": len(gltf.meshes) if gltf.meshes else 0,
            "materials_count": len(gltf.materials) if gltf.materials else 0,
        }
        
        # Extract node hierarchy with names
        if gltf.nodes:
            for idx, node in enumerate(gltf.nodes):
                node_info = {
                    "id": idx,
                    "name": node.name if node.name else f"node_{idx}",
                }
                if node.mesh is not None:
                    node_info["mesh"] = node.mesh
                if node.children:
                    node_info["children"] = node.children
                metadata["nodes"].append(node_info)
        
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        return {"error": str(e), "nodes": []}


def render_step_file(step_file_uuid: str, output_uuid: str) -> Optional[Dict[str, Any]]:
    """
    Convert a STEP file to GLB format and store in render bucket.
    
    Pipeline:
    1. Download STEP file from blob storage
    2. Convert STEP to GLB using cascadio (OpenCASCADE)
    3. Extract component metadata for highlighting
    4. Upload GLB to render bucket
    5. Return metadata
    
    Args:
        step_file_uuid: UUID of the STEP file to convert
        output_uuid: UUID for the rendered GLB output
        
    Returns:
        metadata_dict
    """
    step_storage: BlobStorageClient = get_step_file_storage()
    render_storage: BlobStorageClient = get_render_storage()
    
    # Create temporary directory for processing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        step_file_path = temp_path / f"{step_file_uuid}.step"
        glb_file_path = temp_path / f"{output_uuid}.glb"
        
        try:
            # Step 1: Download STEP file from blob storage
            logger.info(f"Downloading STEP file {step_file_uuid}")
            step_storage.download_file(step_file_uuid, str(step_file_path))
            
            # Step 2: Convert STEP to GLB using cascadio
            logger.info(f"Converting STEP to GLB: {step_file_uuid} -> {output_uuid}")
            # Parameters: input_file, output_file, linear_deflection, angular_deflection
            # linear_deflection controls mesh detail (smaller = more detailed)
            # angular_deflection controls mesh detail (smaller = more detailed)
            cascadio.step_to_glb(str(step_file_path), str(glb_file_path), 0.1, 0.5)
            
            # Step 3: Extract metadata from GLB
            logger.info(f"Extracting metadata from GLB {output_uuid}")
            metadata = extract_gltf_metadata(str(glb_file_path))
            
            # Step 4: Upload GLB to render bucket
            logger.info(f"Uploading GLB to render bucket {output_uuid}")
            with open(glb_file_path, 'rb') as glb_file:
                # Get presigned upload URL
                upload_info = render_storage.get_presigned_upload_url(output_uuid)
                
                # Upload via presigned URL
                response = requests.put(upload_info.url, data=glb_file)
                response.raise_for_status()
            
            logger.info(f"Successfully rendered {step_file_uuid}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error rendering STEP file {step_file_uuid}: {e}")
            raise

@celery_app.task(bind=True, name="app.services.render.process_render_task_sync")
def process_render_task_sync(self, file_uuid: str):
    """
    Synchronous Celery task to render STEP file to GLB.
    
    Updates both database and Redis cache with progress.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.database import get_sync_database_url
    
    # Create synchronous engine for Celery worker
    engine = create_engine(get_sync_database_url())
    
    with Session(engine) as session:
        try:
            # Fetch file from database
            step_file = session.query(StepFile).filter(
                StepFile.uuid == file_uuid
            ).first()

            if not step_file:
                logger.error(f"File {file_uuid} not found for rendering")
                FileStatusCache.set_status(
                    file_uuid, 
                    TaskStatus.FAILED, 
                    self.request.id, 
                    TaskMetadata(error="File not found")
                )
                return {"status": "error", "message": "File not found"}
        
            # Update to PROCESSING
            step_file.status = UploadStatus.PROCESSING
            session.commit()

            # Cache processing status
            FileStatusCache.set_status(
                file_uuid, 
                TaskStatus.PROCESSING, 
                self.request.id, 
                TaskMetadata(progress=0, message="Starting conversion")
            )
            
            logger.info(f"Starting render for {file_uuid}")

            # Update progress - downloading
            FileStatusCache.update_progress(file_uuid, 20, "Downloading STEP file")

            # Do rendering (blocking operation)
            FileStatusCache.update_progress(file_uuid, 30, "Converting to GLB format")
            metadata = render_step_file(file_uuid, file_uuid)

            # Update progress - uploading
            FileStatusCache.update_progress(file_uuid, 80, "Uploading rendered model")

            # Update database with results
            step_file.status = UploadStatus.PROCESSED
            step_file.metadata_json = metadata
            step_file.processed_at = datetime.now(timezone.utc)
            session.commit()

            # Cache completed status
            FileStatusCache.set_status(
                file_uuid,
                TaskStatus.PROCESSED,
                self.request.id,
                TaskMetadata(
                    progress=100,
                    message="Conversion complete"
                )
            )
            
            logger.info(f"Finished rendering {file_uuid}")
            
            return {
                "status": "success",
                "file_uuid": file_uuid,
                "metadata": metadata
            }

        except Exception as e:
            logger.error(f"Error rendering file {file_uuid}: {e}")
            
            # Update database to FAILED
            if step_file:
                step_file.status = UploadStatus.FAILED
                step_file.error_message = str(e)
                session.commit()
                
            # Cache failed status
            FileStatusCache.set_status(
                file_uuid, 
                TaskStatus.FAILED, 
                self.request.id,
                TaskMetadata(error=str(e))
            )
            
            raise
    
    # @celery_app.task(bind=True, name="app.services.render.process_render_task")
    # async def process_render_task(file_uuid: str):
    #     """Background task to render STEP file to GLB"""
    #     async with sessionmanager.session() as db:
    #         try:
    #             # Update status to PROCESSING
    #             result = await db.execute(
    #                 select(StepFile).where(StepFile.uuid == file_uuid)
    #             )
    #             step_file = result.scalar_one_or_none()
    #             if not step_file:
    #                 logger.error(f"File {file_uuid} not found for rendering")
    #                 return
                
    #             step_file.status = UploadStatus.PROCESSING
    #             await db.commit()
                
    #             # do rendering - use same UUID as step file for simplicity
    #             logger.info(f"Starting render for {file_uuid}")
                
    #             rendered_url, metadata = await render_step_file(file_uuid, file_uuid)
                
    #             # update database row
    #             step_file.status = UploadStatus.PROCESSED
    #             step_file.render_blob_url = rendered_url
    #             step_file.metadata_json = metadata
    #             step_file.processed_at = datetime.now(timezone.utc)
    #             await db.commit()
                
    #             logger.info(f"Finished rendering {file_uuid}")
                
    #         except Exception as e:
    #             logger.error(f"Error rendering file {file_uuid}: {e}")
    #             # set status to FAILED
    #             result = await db.execute(
    #                 select(StepFile).where(StepFile.uuid == file_uuid)
    #             )
    #             step_file = result.scalar_one_or_none()
    #             if step_file:
    #                 step_file.status = UploadStatus.FAILED
    #                 step_file.error_message = str(e)
    #                 await db.commit()