"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const PageField = dynamic(() => import("@/components/page-field"), { ssr: false });
const LoginField = dynamic(() => import("@/components/login-field"), { ssr: false });

export function PageFieldLoader() {
  const pathname = usePathname();
  if (pathname === "/login") return <LoginField />;
  return <PageField />;
}
