import { notFound } from "next/navigation";
import { FileText, Calendar, HardDrive, Loader2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StepFileInfoResponse, stepFileInfoResponseSchema } from "@/app/lib/schemas/step";
import { getApiUrl } from "@/lib/api-config";
import { ModelViewerWrapper } from "@/components/model-viewer-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";

interface FilePageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export default async function FilePage({ params }: FilePageProps) {
  const { uuid } = await params;

  const file: StepFileInfoResponse = await fetch(
    getApiUrl(`api/v1/files/${uuid}`),
    { cache: 'no-store' }
  ).then((res) => res.json());
  console.log(file);
  const parsedFile = stepFileInfoResponseSchema.parse(file);

  if (!parsedFile) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{file.filename}</h1>
        </div>
      </div>

      <Separator />

      {/* File Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">File Information</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Filename</div>
                <div className="text-sm text-muted-foreground break-all">
                  {parsedFile.filename}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Uploaded</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(parsedFile.uploaded_at ?? '').toLocaleString()}
                </div>
              </div>
            </div>

            {parsedFile.file_size && (
              <div className="flex items-start gap-3">
                <HardDrive className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">File Size</div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(parsedFile.file_size)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Storage Details</h2>
          
          <div className="space-y-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm font-medium mb-2">File ID</div>
              <code className="text-xs text-muted-foreground">
                {parsedFile.uuid}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Model Viewer */}
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">3D Model Viewer</h2>
          <StatusBadge status={parsedFile.status} />
        </div>
        
        {parsedFile.status === 'processed' && parsedFile.render_blob_url ? (
          <div className="rounded-lg border overflow-hidden">
            <ModelViewerWrapper uuid={parsedFile.uuid} metadata={parsedFile.metadata_json} />
          </div>
        ) : parsedFile.status === 'processing' ? (
          <div className="rounded-lg border bg-muted/50 p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Converting STEP file to 3D web model...</p>
            </div>
          </div>
        ) : parsedFile.status === 'failed' ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-12 flex items-center justify-center">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm font-medium text-destructive mb-2">Conversion Failed</p>
              {parsedFile.error_message && (
                <p className="text-xs text-muted-foreground">{parsedFile.error_message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-12 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Waiting for file to be uploaded...</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Section */}
      {parsedFile.metadata_json && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Model Metadata</h2>
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Components:</span>
                  <span className="font-medium">{parsedFile.metadata_json.nodes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meshes:</span>
                  <span className="font-medium">{parsedFile.metadata_json.meshes_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materials:</span>
                  <span className="font-medium">{parsedFile.metadata_json.materials_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Raw Data Section */}
      <Separator />
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Raw Data</h2>
        <div className="rounded-lg border bg-muted/50 p-4">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(parsedFile, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

