"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import { cn } from "cn";

const sections = [
  { href: "/jobs", label: "Jobs" },
  { href: "/market", label: "Market" },
  { href: "/apply", label: "Apply list" },
];

export function Shell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: "candidate" | "admin";
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-6 px-5 pt-6 pb-4">
          <div>
            <p className="font-serif text-2xl tracking-tight">Nigel Down</p>
            <p className="text-sm text-muted-foreground">His privacy search</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              Profile
            </Link>
            {role === "admin" ? (
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            ) : null}
            <form action={signOut}>
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-8 border-b px-5 pb-3 md:flex">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "font-serif text-xl tracking-tight",
                pathname.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10 pb-28 md:pb-16">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-3xl">
          {sections.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "block py-4 text-center font-serif text-lg",
                  pathname.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="sr-only">{name}</p>
    </div>
  );
}
