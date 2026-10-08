import Link from "next/link";

export function MissingJob() {
  return (
    <div className="rise">
      <h1 className="display text-[clamp(36px,10vw,44px)] break-words sm:text-[clamp(44px,6vw,72px)]">That role is no longer here</h1>
      <p className="mt-6 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">It may have been cleared, or the link is old.</p>
      <Link href="/jobs" className="eyebrow mt-8 inline-block tracking-[0.12em] hover:text-[#FF6B5B]">
        ← Jobs
      </Link>
    </div>
  );
}
