import { size, z } from "zod";

// upload request schema
export const stepUploadSchema = z.object({
    filename: z.string(),
    size: z.number(),
});

// upload finished request schema
export const stepUploadFinishedSchema = z.object({
    object_uuid: z.string(),
});

// GLTF metadata schemas
export const gltfNodeMetadataSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    mesh: z.number().optional(),
    children: z.array(z.number()).optional(),
});

export const gltfMetadataSchema = z.object({
    nodes: z.array(gltfNodeMetadataSchema).optional(),
    meshes_count: z.number().optional(),
    materials_count: z.number().optional(),
});

export const componentHoverInfoSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    nodeId: z.number().nullable(),
    meshIndex: z.number().nullable(),
    childCount: z.number(),
});

// file info response schema
export const stepFileInfoResponseSchema = z.object({
    uuid: z.string(),
    filename: z.string(),
    file_size: z.number().nullable(),
    blob_url: z.string().nullable(),
    render_blob_url: z.string().nullable(),
    metadata_json: gltfMetadataSchema.nullable(),
    error_message: z.string().nullable(),
    status: z.string(),
    uploaded_at: z.string().nullable(),
    processed_at: z.string().nullable(),
})

// Step file status info response 
export const processStatusUpdateSchema = z.object({
    uuid: z.string(),
    status: z.string(),
    task_id: z.string().nullable(),
    task_status: z.string().nullable(),
    task_info: z.record(z.string(), z.any()).nullable(),
});

export const stepFileInfoResponseArraySchema = z.array(stepFileInfoResponseSchema);

// upload types
export type StepUpload = z.infer<typeof stepUploadSchema>;
export type StepUploadFinished = z.infer<typeof stepUploadFinishedSchema>;
export type StepFileInfoResponse = z.infer<typeof stepFileInfoResponseSchema>;
export type ProcessStatusUpdate = z.infer<typeof processStatusUpdateSchema>;

// GLTF metadata types
export type GltfNodeMetadata = z.infer<typeof gltfNodeMetadataSchema>;
export type GltfMetadata = z.infer<typeof gltfMetadataSchema>;
export type ComponentHoverInfo = z.infer<typeof componentHoverInfoSchema>;

// presigned URL schema
export const presignedUrlSchema = z.object({
    url: z.string(),
    object_uuid: z.string(),
});

export type PresignedUrl = z.infer<typeof presignedUrlSchema>;

// Dowload Url schema
export const renderDownloadUrlSchema = z.object({
    download_url: z.string(),
    expires_in: z.number(),
});

export type RenderDownloadUrl = z.infer<typeof renderDownloadUrlSchema>;

// Step finished response
export const stepUploadFinishedResponseSchema = z.object({
    status: z.string(),
    uuid: z.string(),
    file_status: z.string(),
});

export type StepUploadFinishedResponse = z.infer<typeof stepUploadFinishedResponseSchema>;

// delete file response
export const deleteFileResponseSchema = z.object({
    status: z.string(),
    message: z.string(),
    uuid: z.string(),
});

export type DeleteFileResponse = z.infer<typeof deleteFileResponseSchema>;