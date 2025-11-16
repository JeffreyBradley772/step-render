"use client";

import Link from "next/link";
import { FileText, Trash } from "lucide-react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { StepFileInfoResponse } from "@/app/lib/schemas/step";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiUrl } from "@/lib/api-config";

interface FileListItemProps {
  file: StepFileInfoResponse;
}

export function FileListItem({ file }: FileListItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Delete ${file.filename}?`)) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(getApiUrl(`api/v1/files/${file.uuid}`), {
        method: "DELETE",
      });
      
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete file");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidebarMenuItem>
      <div className="flex items-center gap-1 w-full">
        <SidebarMenuButton asChild className="flex-1">
          <Link href={`/file/${file.uuid}`}>
            <FileText className="h-4 w-4" />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="truncate">{file.filename}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(file.uploaded_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
          title="Delete file"
        >
          <Trash className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </SidebarMenuItem>
  );
}
