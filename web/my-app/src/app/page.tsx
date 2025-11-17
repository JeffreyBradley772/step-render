import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, Cog, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            STEP Renderer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Transform your STEP CAD files into interactive 3D models. 
            Upload, render, and explore your designs in real-time.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/upload">
              Upload Now
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Upload STEP Files</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop or browse to upload your CAD files
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Cog className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Automatic Rendering</h3>
            <p className="text-sm text-muted-foreground">
              Files are converted to GLB format automatically
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Interactive 3D View</h3>
            <p className="text-sm text-muted-foreground">
              Explore components with hover metadata and controls
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
