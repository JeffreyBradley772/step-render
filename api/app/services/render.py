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


async def render_step_file(step_file_uuid: str, output_uuid: str) -> tuple[str, Optional[Dict[str, Any]]]:
    """
    Convert a STEP file to GLB format and store in render bucket.
    
    Pipeline:
    1. Download STEP file from blob storage
    2. Convert STEP to GLB using cascadio (OpenCASCADE)
    3. Extract component metadata for highlighting
    4. Upload GLB to render bucket
    5. Return render URL and metadata
    
    Args:
        step_file_uuid: UUID of the STEP file to convert
        output_uuid: UUID for the rendered GLB output
        
    Returns:
        Tuple of (rendered_url, metadata_dict)
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
            
            # Step 5: Get final URL
            rendered_url = render_storage.get_object_url(output_uuid)
            logger.info(f"Successfully rendered {step_file_uuid} to {rendered_url}")
            
            return rendered_url, metadata
            
        except Exception as e:
            logger.error(f"Error rendering STEP file {step_file_uuid}: {e}")
            raise


async def process_render_task(file_uuid: str):
    """Background task to render STEP file to GLB"""
    async with sessionmanager.session() as db:
        try:
            # Update status to PROCESSING
            result = await db.execute(
                select(StepFile).where(StepFile.uuid == file_uuid)
            )
            step_file = result.scalar_one_or_none()
            if not step_file:
                logger.error(f"File {file_uuid} not found for rendering")
                return
            
            step_file.status = UploadStatus.PROCESSING
            await db.commit()
            
            # do rendering
            render_uuid = str(uuid.uuid4())
            logger.info(f"Starting render for {file_uuid} -> {render_uuid}")
            
            rendered_url, metadata = await render_step_file(file_uuid, render_uuid)
            
            # update database row
            step_file.status = UploadStatus.PROCESSED
            step_file.render_blob_url = rendered_url
            step_file.metadata_json = metadata
            step_file.processed_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"Finished rendering {file_uuid}")
            
        except Exception as e:
            logger.error(f"Error rendering file {file_uuid}: {e}")
            # set status to FAILED
            result = await db.execute(
                select(StepFile).where(StepFile.uuid == file_uuid)
            )
            step_file = result.scalar_one_or_none()
            if step_file:
                step_file.status = UploadStatus.FAILED
                step_file.error_message = str(e)
                await db.commit()