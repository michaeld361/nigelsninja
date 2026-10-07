import Link from "next/link";

export function MissingJob() {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-10">
      <h1 className="font-serif text-2xl">That role is not in the queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or the link is out of date.</p>
      <Link href="/jobs" className="mt-4 inline-block text-sm underline">
        Back to Today
      </Link>
    </div>
  );
}
