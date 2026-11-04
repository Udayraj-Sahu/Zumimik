"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[route-error]", error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground px-6 text-center">
      <h1 className="text-6xl font-bold text-destructive font-display">ERROR</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        The wall encountered a fault. Signals disrupted.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded text-sm tracking-wide cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}
