import { getSession } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401 });
  const { id } = await context.params;
  const file = loadStore().profileFiles.find((item) => item.id === id);
  if (!file) return new NextResponse("File not found", { status: 404 });
  const full = path.resolve(process.cwd(), file.storagePath);
  const root = process.cwd();
  if (!full.startsWith(root) || !fs.existsSync(full)) return new NextResponse("File not found", { status: 404 });
  const bytes = fs.readFileSync(full);
  const type = full.endsWith(".pdf")
    ? "application/pdf"
    : full.endsWith(".pptx")
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=600",
    },
  });
}
