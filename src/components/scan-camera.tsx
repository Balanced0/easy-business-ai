// Camera capture component for the /scan route.
// - Live <video> preview using rear camera when available.
// - Shutter button → captures current frame to a JPEG data URL.
// - Multi-page support (snap several pages, then extract).
// - File-upload fallback for desktops without a camera.

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, ImagePlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Props = {
  pages: string[];
  onPagesChange: (pages: string[]) => void;
  maxPages?: number;
};

export function ScanCamera({ pages, onPagesChange, maxPages = 6 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    if (pages.length >= maxPages) {
      toast.error(`Max ${maxPages} pages per scan`);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onPagesChange([...pages, dataUrl]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = maxPages - pages.length;
    const accepted = files.slice(0, remaining);
    Promise.all(
      accepted.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(r.error);
            r.readAsDataURL(f);
          }),
      ),
    ).then((urls) => onPagesChange([...pages, ...urls]));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePage = (idx: number) => {
    onPagesChange(pages.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <Card className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        {active ? (
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
            <Camera className="h-10 w-10" />
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : (
              <p>Tap "Start camera" to scan, or upload images below.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Start camera
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload images
              </Button>
            </div>
          </div>
        )}
      </Card>

      {active && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={snap} size="lg" className="rounded-full px-6">
            <Camera className="mr-2 h-5 w-5" />
            Capture page {pages.length + 1}
          </Button>
          <Button variant="outline" onClick={stopCamera}>
            <X className="mr-2 h-4 w-4" />
            Stop
          </Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Add from gallery
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      {pages.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {pages.map((p, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-md border">
              <img src={p} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                Page {i + 1}
              </div>
              <button
                type="button"
                onClick={() => removePage(i)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {pages.length > 0 && pages.length < maxPages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {pages.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onPagesChange([])}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear all pages
        </Button>
      )}
    </div>
  );
}
