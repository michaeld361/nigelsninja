"use client";

import dynamic from "next/dynamic";

const PageField = dynamic(() => import("@/components/page-field"), { ssr: false });

export function PageFieldLoader() {
  return <PageField />;
}
