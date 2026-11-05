"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { parseSignedPairingPayload } from "@/services/backend-adapters";

/**
 * Camera scanner for a friend's "Add friend" QR (code.sig). Opens the rear camera, decodes frames with jsQR, and hands the
 * first valid friend payload to `onScan` as the raw text; it then stops the camera. A QR that is not a friend code (an
 * invite link, a login pairing code with a bad shape) is ignored and scanning continues.
 */
export function FriendQrScanner({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest callbacks without restarting the camera when the parent re-renders.
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    setError(null);

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hit = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
          if (hit?.data && parseSignedPairingPayload(hit.data.trim())) {
            stop();
            onScanRef.current(hit.data.trim());
            onCloseRef.current();
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device can't open the camera here. Paste the friend's code instead.");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.setAttribute("playsinline", "true");
          await video.play().catch(() => undefined);
        }
        raf = requestAnimationFrame(tick);
      } catch (err) {
        const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setError(
          denied
            ? "Camera access was blocked. Allow the camera for this app, or paste the friend's code instead."
            : "Couldn't start the camera. Paste the friend's code instead.",
        );
      }
    })();

    return stop;
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      placement="center"
      className="max-w-[340px] border-[var(--glass-border)] bg-[var(--glass-02)]"
      ariaLabel="Scan a friend's QR code"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Camera size={15} className="text-primary" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">Scan friend QR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90"
          >
            <X size={15} />
          </button>
        </div>

        {error ? (
          <p role="alert" data-testid="scanner-error" className="mt-4 py-6 text-center text-[12px] text-destructive">
            {error}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-black">
            <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" data-testid="scanner-video" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {!error && (
          <p className="mt-3 text-center font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            Point the camera at your friend&apos;s &ldquo;Add friend&rdquo; QR.
          </p>
        )}
      </div>
    </Dialog>
  );
}
