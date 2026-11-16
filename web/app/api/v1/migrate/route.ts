import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

/** One-shot schema apply (also runs automatically on first feedback). */
export async function POST() {
  try {
    await ensureSchema();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("migrate failed", e);
    return NextResponse.json({ detail: "migrate failed" }, { status: 503 });
  }
}
