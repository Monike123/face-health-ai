import { NextResponse } from "next/server";
import { hrFromTrace } from "@/lib/rppg";
import { USE_CLERK } from "@/lib/dev";
import { validateScan } from "@/lib/validate";

export async function POST(req: Request) {
  if (USE_CLERK) {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ detail: "sign in required" }, { status: 401 });
    }
  }

  let body: { t_ms?: unknown; rgb?: unknown; face_frac?: unknown; measured_fps?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON" }, { status: 422 });
  }
  const checked = validateScan(body);
  if (typeof checked === "string") {
    return NextResponse.json({ detail: checked }, { status: 422 });
  }
  const faceFrac =
    typeof body.face_frac === "number" && Number.isFinite(body.face_frac)
      ? Math.min(1, Math.max(0, body.face_frac))
      : 1;
  const measuredFps =
    typeof body.measured_fps === "number" && Number.isFinite(body.measured_fps)
      ? body.measured_fps
      : undefined;
  return NextResponse.json(
    hrFromTrace(checked.t_ms, checked.rgb, { faceFrac, measuredFps }),
  );
}
