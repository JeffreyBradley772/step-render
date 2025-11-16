import { notFound } from "next/navigation";
import { FileText, Calendar, HardDrive } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StepFileInfoResponse, stepFileInfoResponseSchema } from "@/app/lib/schemas/step";
import { getApiUrl } from "@/lib/api-config";

interface FilePageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export default async function FilePage({ params }: FilePageProps) {
  const { uuid } = await params;

  const file: StepFileInfoResponse = await fetch(
    getApiUrl(`api/v1/files/${uuid}`)
  ).then((res) => res.json());
  console.log(file);
  const parsedFile = stepFileInfoResponseSchema.parse(file);

  if (!parsedFile) {
    notFound();
  }
  // pull file from fast api database then render from blob storage

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
        <p className="text-muted-foreground">
          File details and information
        </p>
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
                  {new Date(parsedFile.uploaded_at).toLocaleString()}
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

      {/* Random Data Section (can add more here) */}
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
