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

// file info response schema
export const stepFileInfoResponseSchema = z.object({
    uuid: z.string(),
    filename: z.string(),
    file_size: z.number().nullable(),
    blob_url: z.string().nullable(),
    status: z.string(),
    uploaded_at: z.string(),
    processed_at: z.string().nullable(),
})

export const stepFileInfoResponseArraySchema = z.array(stepFileInfoResponseSchema);

// upload types
export type StepUpload = z.infer<typeof stepUploadSchema>;
export type StepUploadFinished = z.infer<typeof stepUploadFinishedSchema>;
export type StepFileInfoResponse = z.infer<typeof stepFileInfoResponseSchema>;

// presigned URL schema
export const presignedUrlSchema = z.object({
    url: z.string(),
    object_uuid: z.string(),
});

export type PresignedUrl = z.infer<typeof presignedUrlSchema>;

