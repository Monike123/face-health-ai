import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hrFromTrace } from "@/lib/rppg";

const DEV = process.env.NEXT_PUBLIC_DEV_AUTH === "1";

type Body = { t_ms?: unknown; rgb?: unknown };

function validate(body: Body): { t_ms: number[]; rgb: number[][] } | string {
  if (!Array.isArray(body.t_ms) || !Array.isArray(body.rgb)) return "t_ms and rgb required";
  const t_ms = body.t_ms as number[];
  const rgb = body.rgb as number[][];
  if (t_ms.length !== rgb.length) return "t_ms and rgb must have the same length";
  if (t_ms.length < 300 || t_ms.length > 2400) return "sample count out of range";
  for (let i = 1; i < t_ms.length; i++) {
    if (!(t_ms[i] > t_ms[i - 1])) return "t_ms must be strictly increasing";
  }
  const span = (t_ms[t_ms.length - 1] - t_ms[0]) / 1000;
  if (span < 20 || span > 40) return "scan must last 20-40 s";
  if (t_ms.length / span < 10) return "frame rate below 10 fps";
  for (const row of rgb) {
    if (!Array.isArray(row) || row.length !== 3) return "rgb rows must be [R,G,B]";
    for (const v of row) {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 255) {
        return "rgb values must be finite and in [0, 255]";
      }
    }
  }
  return { t_ms, rgb };
}

export async function POST(req: Request) {
  if (!DEV) {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ detail: "sign in required" }, { status: 401 });
    }
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON" }, { status: 422 });
  }
  const checked = validate(body);
  if (typeof checked === "string") {
    return NextResponse.json({ detail: checked }, { status: 422 });
  }
  return NextResponse.json(hrFromTrace(checked.t_ms, checked.rgb));
}
