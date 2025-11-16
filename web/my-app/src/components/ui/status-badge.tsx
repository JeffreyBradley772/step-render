
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    uploading: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Uploading',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    uploaded: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Uploaded',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    processing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Processing',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    processed: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Processed',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  const config = statusConfig[status] || statusConfig.uploading;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </div>
  );
}