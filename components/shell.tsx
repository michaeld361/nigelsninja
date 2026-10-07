"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";

const sections = [
  { href: "/jobs", label: "Jobs", key: "jobs" as const },
  { href: "/market", label: "Market", key: "market" as const },
  { href: "/apply", label: "Apply list", key: "apply" as const },
];

export function Shell({
  children,
  name,
  role,
  counts,
}: {
  children: React.ReactNode;
  name: string;
  role: "candidate" | "admin";
  counts: { jobs: number; market: number; apply: number };
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#0E0F11] text-[#F2F1EC] max-md:overflow-x-clip md:grid md:grid-cols-[minmax(200px,240px)_minmax(0,1fr)]">
      <aside className="box-border flex flex-col justify-between gap-8 border-b border-[rgba(242,241,236,0.1)] px-5 py-5 md:sticky md:top-0 md:h-screen md:gap-10 md:border-r md:border-b-0 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 md:gap-11">
          <Link href="/jobs">
            <div className="font-[family-name:var(--font-bricolage)] text-[34px] leading-none font-bold tracking-[-0.02em]">
              nigelsninja<span className="text-[#FF6B5B]">.</span>
            </div>
            <div className="mt-2.5 font-mono text-[10px] tracking-[0.14em] text-[rgba(242,241,236,0.5)] uppercase">His privacy search</div>
          </Link>
          <nav className="flex flex-row flex-wrap gap-x-5 gap-y-1 md:flex-col md:flex-nowrap md:gap-0.5">
            {sections.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-baseline justify-between gap-3 border-b border-[rgba(242,241,236,0.08)] py-2 text-left font-[family-name:var(--font-bricolage)] text-xl leading-none font-bold tracking-[-0.01em] whitespace-nowrap transition-colors hover:text-[#FF6B5B] md:py-2.5"
                  style={{ color: active ? "#F2F1EC" : "rgba(242,241,236,.45)" }}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[11px]" style={{ color: active ? "#FF6B5B" : "rgba(242,241,236,.45)" }}>
                    {counts[item.key]}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-row flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.06em] uppercase md:flex-col md:flex-nowrap md:gap-2.5">
          <Link href="/settings" className="text-left text-[rgba(242,241,236,0.5)] hover:text-[#F2F1EC]">
            Profile
          </Link>
          {role === "admin" ? (
            <Link href="/admin" className="text-left text-[rgba(242,241,236,0.5)] hover:text-[#F2F1EC]">
              Admin
            </Link>
          ) : null}
          <form action={signOut}>
            <button type="submit" className="text-left text-[rgba(242,241,236,0.5)] hover:text-[#F2F1EC]">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="box-border w-full min-w-0 max-w-[860px] px-5 pt-8 pb-24 sm:px-6 md:px-[clamp(24px,5vw,72px)] md:pt-10 md:pb-[120px]">
        <p className="sr-only">{name}</p>
        {children}
      </main>
    </div>
  );
}
