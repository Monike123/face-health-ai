"use client";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { meanRoiRgb, roiPolygons } from "@/lib/roi";

const SCAN_SECONDS = 30;
const MP_VERSION = "1.2.3"; // keep equal to @mediapipe/tasks-vision in package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const W = 320;
const H = 240;

type Phase = "consent" | "loading" | "ready" | "scanning" | "processing" | "result" | "error";
type Result = {
  hr_bpm: number | null;
  quality: "good" | "low";
  message: string;
  disclaimer: string;
};
type Samples = { t: number[]; rgb: [number, number, number][]; missed: number; start: number | null };

async function createLandmarker(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const make = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  try {
    return await make("GPU");
  } catch {
    return make("CPU");
  }
}

function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError")
    return "Camera permission was denied. Allow camera access in your browser settings and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No usable camera was found.";
  if (name === "NotReadableError")
    return "Your camera is being used by another app. Close it and try again.";
  return "Could not start the camera or load the face model. Check your connection and try again.";
}

export default function ScanClient({
  getToken,
}: {
  getToken: () => Promise<string | null>;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [agreed, setAgreed] = useState(false);
  const [faceFound, setFaceFound] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SCAN_SECONDS);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(0);
  const faceRef = useRef(false);
  const scanningRef = useRef(false);
  const samplesRef = useRef<Samples>({ t: [], rgb: [], missed: 0, start: null });

  useEffect(() => {
    const loop = loopRef;
    const stream = streamRef;
    const landmarker = landmarkerRef;
    return () => {
      loop.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      landmarker.current?.close();
    };
  }, []);

  function stopCamera() {
    loopRef.current++;
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function fail(msg: string) {
    stopCamera();
    setError(msg);
    setPhase("error");
  }

  async function startCamera() {
    setPhase("loading");
    setError("");
    setResult(null);
    try {
      landmarkerRef.current ??= await createLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setPhase("ready");
      startLoop();
    } catch (e) {
      fail(cameraError(e));
    }
  }

  function startLoop() {
    const id = ++loopRef.current;
    const frame = Object.assign(document.createElement("canvas"), { width: W, height: H });
    const mask = Object.assign(document.createElement("canvas"), { width: W, height: H });
    const frameCtx = frame.getContext("2d", { willReadFrequently: true })!;
    const maskCtx = mask.getContext("2d", { willReadFrequently: true })!;
    let lastVideoTime = -1;

    const schedule = (cb: (now: number) => void) => {
      const v = videoRef.current;
      if (v && "requestVideoFrameCallback" in v) v.requestVideoFrameCallback((now) => cb(now));
      else requestAnimationFrame(cb);
    };

    const tick = (now: number) => {
      const video = videoRef.current;
      const lm = landmarkerRef.current;
      const overlay = overlayRef.current;
      if (id !== loopRef.current || !video || !lm || !overlay) return;
      if (video.currentTime === lastVideoTime) return schedule(tick);
      lastVideoTime = video.currentTime;

      const face = lm.detectForVideo(video, now).faceLandmarks[0];
      const octx = overlay.getContext("2d")!;
      octx.clearRect(0, 0, W, H);
      let rgb: [number, number, number] | null = null;
      if (face) {
        const polys = roiPolygons(face, W, H);
        octx.strokeStyle = "rgba(94, 234, 212, 0.9)";
        octx.lineWidth = 1.5;
        for (const poly of polys) {
          octx.beginPath();
          poly.forEach((p, i) => (i === 0 ? octx.moveTo(p.x, p.y) : octx.lineTo(p.x, p.y)));
          octx.closePath();
          octx.stroke();
        }
        if (scanningRef.current) {
          frameCtx.drawImage(video, 0, 0, W, H);
          rgb = meanRoiRgb(frameCtx, maskCtx, polys);
        }
      }
      if (!!face !== faceRef.current) {
        faceRef.current = !!face;
        setFaceFound(!!face);
      }

      if (scanningRef.current) {
        const s = samplesRef.current;
        s.start ??= now;
        if (rgb) {
          s.t.push(now);
          s.rgb.push(rgb);
        } else {
          s.missed++;
        }
        const elapsed = (now - s.start) / 1000;
        setSecondsLeft(Math.max(0, Math.ceil(SCAN_SECONDS - elapsed)));
        if (elapsed >= SCAN_SECONDS) {
          void submit();
          return;
        }
      }
      schedule(tick);
    };
    schedule(tick);
  }

  function beginScan() {
    samplesRef.current = { t: [], rgb: [], missed: 0, start: null };
    setSecondsLeft(SCAN_SECONDS);
    scanningRef.current = true;
    setPhase("scanning");
  }

  async function submit() {
    stopCamera();
    setPhase("processing");
    const s = samplesRef.current;
    if (s.missed > 0.2 * (s.t.length + s.missed))
      return fail("Your face was not visible for much of the scan. Keep your face centred and try again.");
    if (s.t.length < 300)
      return fail("Your device processed too few frames. Close other apps or tabs and try again.");
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const t0 = s.t[0];
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({ t_ms: s.t.map((t) => t - t0), rgb: s.rgb }),
      });
      if (res.status === 401) return fail("Your session expired. Please sign in again.");
      if (res.status === 503)
        return fail("Server auth is not configured. Check FACEHEALTH_DEV_AUTH or Clerk keys.");
      if (!res.ok)
        return fail(
          res.status === 422
            ? "The scan data was not usable. Please try again."
            : "Server error. Please try again in a moment.",
        );
      setResult(await res.json());
      setPhase("result");
    } catch {
      fail("Network error. Check your connection and try again.");
    }
  }

  const showCamera = phase === "loading" || phase === "ready" || phase === "scanning";
  const progress = ((SCAN_SECONDS - secondsLeft) / SCAN_SECONDS) * 100;

  return (
    <div className="fh-fade flex flex-1 flex-col">
      {phase === "consent" && (
        <div className="fh-rise flex flex-1 flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Before you begin
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.85rem] leading-tight tracking-[-0.03em]">
            A calm thirty seconds
          </h1>
          <div className="fh-panel mt-5 space-y-3.5 p-4 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">
            <p>Sit in even light. Avoid bright windows behind you.</p>
            <p>Keep your face centred. Stay still. Try not to talk.</p>
            <p>Your video stays on this device. Only colour averages are sent, and nothing is stored.</p>
          </div>
          <label className="fh-check fh-panel mt-4 p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I understand this is a wellness estimate, not a medical measurement, and should not
              be used for medical decisions.
            </span>
          </label>
          <button
            className="fh-btn fh-btn-primary mt-auto w-full"
            disabled={!agreed}
            onClick={startCamera}
          >
            Enable camera
          </button>
        </div>
      )}

      <div className={showCamera ? "flex flex-1 flex-col" : "hidden"}>
        <div className="fh-cam">
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} width={W} height={H} />
          <div className="fh-cam-frame" />
          <div className="fh-cam-hud">
            {phase === "loading" && (
              <div className="flex items-center gap-3">
                <div className="fh-spin" />
                <p className="text-sm">Warming up camera and face model…</p>
              </div>
            )}
            {phase === "ready" && (
              <div className="space-y-3">
                <p className="text-sm">
                  {faceFound
                    ? "Face locked. Get comfortable, then start."
                    : "Centre your face in the frame."}
                </p>
                <button
                  className="fh-btn fh-btn-primary w-full"
                  disabled={!faceFound}
                  onClick={beginScan}
                >
                  Start 30s scan
                </button>
              </div>
            )}
            {phase === "scanning" && (
              <div className="text-center" aria-live="polite">
                <div className="fh-ring" style={{ ["--p" as string]: progress }}>
                  <span>{secondsLeft}</span>
                </div>
                <p className="text-sm font-medium">
                  {faceFound ? "Hold still — reading your pulse" : "Face lost — move back into view"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {phase === "processing" && (
        <div className="fh-rise flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="fh-spin" />
          <p className="font-[family-name:var(--font-display)] text-xl">Reading your signal…</p>
          <p className="text-sm text-[var(--ink-soft)]">Usually takes a second</p>
        </div>
      )}

      {phase === "result" && result && (
        <div className="fh-rise flex flex-1 flex-col text-center" aria-live="polite">
          {result.hr_bpm !== null ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Estimated heart rate
              </p>
              <p className="fh-bpm mt-3">
                {Math.round(result.hr_bpm)}
                <span className="ml-2 align-middle text-lg font-semibold tracking-normal text-[var(--ink-soft)]">
                  BPM
                </span>
              </p>
              <div className="mt-4">
                <span className="fh-chip">Signal quality · Good</span>
              </div>
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]">
                Couldn’t get a clear reading
              </p>
              <div className="mt-4">
                <span className="fh-chip fh-chip-warn">Signal quality · Low</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)]">{result.message}</p>
            </>
          )}
          <p className="mt-6 text-xs leading-relaxed text-[var(--ink-soft)]">{result.disclaimer}</p>
          <button className="fh-btn fh-btn-primary mt-auto w-full" onClick={startCamera}>
            Scan again
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="fh-rise flex flex-1 flex-col" role="alert">
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]">
            Something went wrong
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--danger)]">{error}</p>
          <button className="fh-btn fh-btn-primary mt-auto w-full" onClick={startCamera}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
