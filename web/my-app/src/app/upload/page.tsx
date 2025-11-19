'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { StepUpload, PresignedUrl, presignedUrlSchema, stepUploadFinishedResponseSchema, StepUploadFinishedResponse } from '@/app/lib/schemas/step';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-config';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/step': ['.step', '.stp'],
      'application/octet-stream': ['.step', '.stp'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // get upload url
      const uploadRequest: StepUpload = {
        filename: file.name,
        size: file.size,
      };

      const response = await fetch(getApiUrl('api/v1/upload/presigned-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const presignedData: PresignedUrl = presignedUrlSchema.parse(await response.json());

      // upload file
      const uploadResponse = await fetch(presignedData.url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setUploadProgress(100);

      const finishResponse = await fetch(getApiUrl('api/v1/upload/finished'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ object_uuid: presignedData.object_uuid }),
      });

      if (!finishResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const finishData: StepUploadFinishedResponse = stepUploadFinishedResponseSchema.parse(await finishResponse.json());

      setUploadedFileId(finishData.uuid);
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload STEP File</h1>
          <p className="mt-2 text-gray-600">Upload your 3D model file for rendering</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-gray-600">
                    Drag and drop a STEP file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">.step, .stp files supported</p>
                </>
              )}
            </div>
          </div>

          {/* Selected File */}
          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-8 w-8 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadedFileId && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ File uploaded successfully! ID: {uploadedFileId}
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
}