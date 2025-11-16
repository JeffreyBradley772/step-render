import Link from "next/link";
import { Home, Upload } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { stepFileInfoResponseArraySchema } from "@/app/lib/schemas/step";
import { FileListItem } from "@/components/file-list-item";
import { getApiUrl } from "@/lib/api-config";

export async function AppSidebar() {

  const filesData = await fetch(getApiUrl("api/v1/files")).then((res) => res.json());
  const files = stepFileInfoResponseArraySchema.parse(filesData);
  
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="font-semibold">File Manager</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/upload">
                <Upload className="h-5 w-5" />
                <span className="font-semibold">Upload</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Uploaded Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {files.length === 0 ? (
                <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No files uploaded yet
                </div>
              ) : (
                files.map((file) => (
                  <FileListItem key={file.uuid} file={file} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {files.length} {files.length === 1 ? 'file' : 'files'} total
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
