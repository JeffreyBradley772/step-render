'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ModelViewer = dynamic(
  () => import('@/components/model-viewer').then((mod) => ({ default: mod.ModelViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

interface ModelViewerWrapperProps {
  uuid: string;
}

export function ModelViewerWrapper({ uuid }: ModelViewerWrapperProps) {
  return <ModelViewer uuid={uuid} />;
}
