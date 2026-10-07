import { consumeMagicLink } from "@/app/actions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const session = await consumeMagicLink(token);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "127.0.0.1:43123";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const url = new URL(session ? "/jobs" : "/login", `${proto}://${host}`);
  if (!session) url.searchParams.set("error", "link");
  return NextResponse.redirect(url);
}
