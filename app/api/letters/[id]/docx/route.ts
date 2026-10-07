import { getSession } from "@/lib/auth";
import { renderLetterDocx } from "@/lib/docx-letter";
import { loadStore } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401 });
  const { id } = await context.params;
  const store = loadStore();
  const letter = store.letters.find((item) => item.id === id);
  if (!letter) return new NextResponse("Letter not found", { status: 404 });
  const buffer = await renderLetterDocx(letter, store.settings);
  const filename = `${letter.refLine.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
