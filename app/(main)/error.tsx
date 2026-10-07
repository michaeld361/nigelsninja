"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message || "The page could not be loaded."}</p>
      <button type="button" className="mt-4 text-sm underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
