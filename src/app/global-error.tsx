"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  console.error("[global-error]", error);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground px-6 text-center">
          <h1 className="text-6xl font-bold text-destructive font-display">ERROR</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            The arena hit a critical fault. Please reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded text-sm tracking-wide cursor-pointer"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}