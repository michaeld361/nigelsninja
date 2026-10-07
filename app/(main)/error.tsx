"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl tracking-tight">This page did not load</h1>
      <p className="mt-3 text-sm text-muted-foreground">Try once more. If it keeps happening, Michael can look at the log.</p>
      <button type="button" className="mt-4 text-sm underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
