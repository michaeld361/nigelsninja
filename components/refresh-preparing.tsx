"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshWhilePreparing({ preparing }: { preparing: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!preparing) return;
    const handle = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(handle);
  }, [preparing, router]);
  return null;
}
