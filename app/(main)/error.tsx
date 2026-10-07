"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rise max-w-xl">
      <h1 className="display text-[clamp(36px,10vw,44px)] break-words sm:text-[clamp(44px,6vw,72px)]">This page did not load</h1>
      <p className="mt-6 text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">Try once more. If it keeps happening, Michael can look at the log.</p>
      <button type="button" className="pill pill-sm mt-8" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
