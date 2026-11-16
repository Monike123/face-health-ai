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
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
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
    <div className="fh-scan fh-fade">
      <aside className="fh-scan-side">
        {phase === "consent" && (
          <div>
            <p className="fh-kicker">Scan setup</p>
            <h1 className="fh-title" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}>
              30 seconds at your desk
            </h1>
            <div className="fh-panel" style={{ marginTop: "1.1rem", padding: "1rem 1.05rem" }}>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Sit upright in even light. Keep your face inside the frame. Stay still and quiet
                until the timer ends.
              </p>
            </div>
            <label className="fh-check fh-panel" style={{ marginTop: "0.75rem", padding: "1rem" }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I understand this is a wellness estimate, not a medical measurement, and should
                not be used for medical decisions.
              </span>
            </label>
            <button
              className="fh-btn fh-btn-primary"
              style={{ marginTop: "1rem", width: "100%" }}
              disabled={!agreed}
              onClick={startCamera}
            >
              Enable camera
            </button>
          </div>
        )}

        {(phase === "ready" || phase === "loading" || phase === "scanning") && (
          <div>
            <p className="fh-kicker">Live scan</p>
            <h2 className="fh-title" style={{ fontSize: "1.7rem" }}>
              {phase === "scanning" ? `${secondsLeft}s left` : "Ready when you are"}
            </h2>
            <p style={{ marginTop: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
              {phase === "loading" && "Starting camera and loading the face model."}
              {phase === "ready" &&
                (faceFound
                  ? "Face detected. Click start and hold still."
                  : "Move into the frame until your face is detected.")}
              {phase === "scanning" &&
                (faceFound
                  ? "Hold still. Looking for your pulse signal."
                  : "Face lost — move back into the frame.")}
            </p>
            {phase === "ready" && (
              <button
                className="fh-btn fh-btn-primary"
                style={{ marginTop: "1.1rem", width: "100%" }}
                disabled={!faceFound}
                onClick={beginScan}
              >
                Start 30s scan
              </button>
            )}
            {phase === "scanning" && (
              <div className="fh-progress" aria-hidden>
                <span style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {phase === "processing" && (
          <div>
            <p className="fh-kicker">Processing</p>
            <h2 className="fh-title" style={{ fontSize: "1.7rem" }}>
              Estimating heart rate
            </h2>
            <p style={{ marginTop: "0.75rem", color: "var(--muted)" }}>Usually under a second.</p>
          </div>
        )}

        {phase === "result" && result && (
          <div aria-live="polite">
            <p className="fh-kicker">Result</p>
            {result.hr_bpm !== null ? (
              <>
                <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--muted)" }}>
                  Estimated heart rate
                </h2>
                <p className="fh-bpm">
                  {Math.round(result.hr_bpm)}
                  <span style={{ marginLeft: "0.4rem", fontSize: "1rem", color: "var(--muted)" }}>
                    BPM
                  </span>
                </p>
                <span className="fh-tag">Signal quality · Good</span>
              </>
            ) : (
              <>
                <h2 className="fh-title" style={{ fontSize: "1.6rem" }}>
                  No clear reading
                </h2>
                <span className="fh-tag fh-tag-warn">Signal quality · Low</span>
                <p style={{ marginTop: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {result.message}
                </p>
              </>
            )}
            <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.45 }}>
              {result.disclaimer}
            </p>
            <button
              className="fh-btn fh-btn-primary"
              style={{ marginTop: "1.2rem", width: "100%" }}
              onClick={startCamera}
            >
              Scan again
            </button>
          </div>
        )}

        {phase === "error" && (
          <div role="alert">
            <p className="fh-kicker">Error</p>
            <h2 className="fh-title" style={{ fontSize: "1.6rem" }}>
              Camera or scan failed
            </h2>
            <p style={{ marginTop: "0.8rem", color: "var(--danger)", lineHeight: 1.5 }}>{error}</p>
            <button
              className="fh-btn fh-btn-primary"
              style={{ marginTop: "1.2rem", width: "100%" }}
              onClick={startCamera}
            >
              Try again
            </button>
          </div>
        )}
      </aside>

      <div className={showCamera || phase === "consent" ? undefined : "hidden"}>
        <div className="fh-cam">
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} width={W} height={H} />
          <div className="fh-cam-frame" />
          {showCamera && (
            <div className="fh-cam-hud">
              {phase === "loading" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <div className="fh-spin" />
                  <span>Opening camera…</span>
                </div>
              )}
              {phase === "ready" && (
                <span>{faceFound ? "Face in frame" : "Looking for face…"}</span>
              )}
              {phase === "scanning" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span>{faceFound ? "Recording pulse signal" : "Face lost"}</span>
                    <strong>{secondsLeft}s</strong>
                  </div>
                  <div className="fh-progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          {phase === "consent" && (
            <div className="fh-cam-hud">
              <span>Camera preview appears here after you enable access</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
