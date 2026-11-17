"use client";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { liveHrEstimate, type HrResult } from "@/lib/rppg";
import {
  assessQuality,
  canStartScan,
  guideColor,
  resetQualityState,
  type QualityFlags,
} from "@/lib/quality";
import { namedRoiPolygons, sampleRoiRgb } from "@/lib/roi";

const TARGET_SECONDS = 30;
const MAX_SECONDS = 90;
const TARGET_SAMPLES = 180;
const MIN_SAMPLES = 120;
const DETECT_READY_MS = 66;
const DETECT_SCAN_MS = 150;
const SAMPLE_READY = 256;
const SAMPLE_SCAN = 160;
const MP_VERSION = "1.2.3";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
/** Backend / feedback only — never shown in UI. */
const APP_VERSION = "0.2.1";

type Phase =
  | "consent"
  | "loading"
  | "ready"
  | "scanning"
  | "processing"
  | "result"
  | "error";

type Facing = "user" | "environment";

type Samples = {
  t: number[];
  rgb: [number, number, number][];
  missed: number;
  start: number | null;
};

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

function deviceClass(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function faceOval(
  lm: { x: number; y: number }[],
  ow: number,
  oh: number,
): { cx: number; cy: number; rx: number; ry: number } {
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    cx: ((minX + maxX) / 2) * ow,
    cy: ((minY + maxY) / 2) * oh,
    rx: ((maxX - minX) / 2) * ow * 1.15,
    ry: ((maxY - minY) / 2) * oh * 1.2,
  };
}

function drawProgressRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  progress: number,
) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = Math.max(4, rx * 0.06);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + ctx.lineWidth, ry + ctx.lineWidth, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5eead4";
  ctx.lineCap = "round";
  const pad = ctx.lineWidth;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + pad, ry + pad, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const emptyQ: QualityFlags = {
  face: false,
  framing: false,
  lighting: false,
  stillness: true,
  skin: false,
  eyewear: true,
  tip: null,
};

export default function ScanClient({
  getToken,
}: {
  getToken: () => Promise<string | null>;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [agreed, setAgreed] = useState(false);
  const [brightOk, setBrightOk] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [quality, setQuality] = useState<QualityFlags>(emptyQ);
  const [eyewearOverride, setEyewearOverride] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TARGET_SECONDS);
  const [extending, setExtending] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [result, setResult] = useState<HrResult | null>(null);
  const [error, setError] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [accuracy, setAccuracy] = useState<string>("");
  const [experience, setExperience] = useState(0);
  const [refBpm, setRefBpm] = useState("");
  const [refDevice, setRefDevice] = useState("");
  const [comment, setComment] = useState("");
  const [traceConsent, setTraceConsent] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const camWrapRef = useRef<HTMLDivElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(0);
  const scanningRef = useRef(false);
  const samplesRef = useRef<Samples>({ t: [], rgb: [], missed: 0, start: null });
  const lastLmRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  const lastDetectRef = useRef(0);
  const lastLiveHrRef = useRef(0);
  const lastHudRef = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const sampleSizeRef = useRef({ w: SAMPLE_READY, h: Math.round((SAMPLE_READY * 3) / 4) });
  const preloadStarted = useRef(false);
  const extendingRef = useRef(false);
  const facingRef = useRef<Facing>("user");
  const progressRef = useRef(0);

  useEffect(() => {
    if (phase !== "consent" || preloadStarted.current) return;
    preloadStarted.current = true;
    void createLandmarker()
      .then((lm) => {
        landmarkerRef.current = lm;
      })
      .catch(() => {});
  }, [phase]);

  useEffect(() => {
    const loop = loopRef;
    const stream = streamRef;
    const landmarker = landmarkerRef;
    return () => {
      loop.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      landmarker.current?.close();
      void wakeRef.current?.release();
      if (document.fullscreenElement) void document.exitFullscreen?.();
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && scanningRef.current) {
        stopCamera();
        setError("Scan paused because the tab was hidden. Start again.");
        setPhase("error");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function stopCamera() {
    loopRef.current++;
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void wakeRef.current?.release();
    wakeRef.current = null;
    setTorchOn(false);
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  }

  function fail(msg: string) {
    stopCamera();
    setError(msg);
    setPhase("error");
  }

  async function requestWakeLock() {
    try {
      const wl = (
        navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        }
      ).wakeLock;
      wakeRef.current = (await wl?.request("screen")) ?? null;
    } catch {
      wakeRef.current = null;
    }
  }

  async function requestFullscreen() {
    try {
      const el = camWrapRef.current;
      if (el && !document.fullscreenElement) await el.requestFullscreen?.();
    } catch {
      /* optional */
    }
  }

  function syncOverlaySize(scanning: boolean) {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || !video.videoWidth) return;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    const aspect = video.videoWidth / video.videoHeight;
    const long = scanning ? SAMPLE_SCAN : SAMPLE_READY;
    sampleSizeRef.current = { w: long, h: Math.max(64, Math.round(long / aspect)) };
  }

  async function openStream(mode: Facing) {
    facingRef.current = mode;
    setFacing(mode);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: { ideal: mode },
      },
      audio: false,
    });
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.() as { torch?: boolean } | undefined;
    setTorchSupported(Boolean(caps?.torch) && mode === "environment");
    setTorchOn(false);
    const video = videoRef.current!;
    video.srcObject = stream;
    await video.play();
    syncOverlaySize(false);
    video.onloadedmetadata = () => syncOverlaySize(scanningRef.current);
  }

  async function startCamera() {
    setPhase("loading");
    setError("");
    setResult(null);
    setFeedbackDone(false);
    setLiveBpm(null);
    setSampleCount(0);
    setScanProgress(0);
    setEyewearOverride(false);
    resetQualityState();
    try {
      landmarkerRef.current ??= await createLandmarker();
      await openStream(facingRef.current);
      setPhase("ready");
      startLoop();
    } catch (e) {
      fail(cameraError(e));
    }
  }

  async function switchFacing(mode: Facing) {
    if (mode === facingRef.current || phase === "scanning") return;
    setPhase("loading");
    resetQualityState();
    try {
      loopRef.current++;
      await openStream(mode);
      setPhase("ready");
      startLoop();
    } catch (e) {
      fail(cameraError(e));
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function startLoop() {
    const id = ++loopRef.current;
    const { w: sw0, h: sh0 } = sampleSizeRef.current;
    const frame = Object.assign(document.createElement("canvas"), { width: sw0, height: sh0 });
    const mask = Object.assign(document.createElement("canvas"), { width: sw0, height: sh0 });
    const frameCtx = frame.getContext("2d", { willReadFrequently: true })!;
    const maskCtx = mask.getContext("2d", { willReadFrequently: true })!;
    let lastVideoTime = -1;
    let stallCount = 0;

    const schedule = (cb: (now: number) => void) => {
      const v = videoRef.current;
      if (v && "requestVideoFrameCallback" in v) v.requestVideoFrameCallback((now) => cb(now));
      else requestAnimationFrame(() => cb(performance.now()));
    };

    const tick = (now: number) => {
      const video = videoRef.current;
      const lmApi = landmarkerRef.current;
      const overlay = overlayRef.current;
      if (id !== loopRef.current || !video || !lmApi || !overlay) return;

      const scanning = scanningRef.current;
      const timeMoved = video.currentTime !== lastVideoTime;
      if (!timeMoved) {
        stallCount++;
        if (stallCount < 3 || !scanning) return schedule(tick);
      } else {
        stallCount = 0;
        lastVideoTime = video.currentTime;
      }

      syncOverlaySize(scanning);
      const { w: sw, h: sh } = sampleSizeRef.current;
      if (frame.width !== sw || frame.height !== sh) {
        frame.width = sw;
        frame.height = sh;
        mask.width = sw;
        mask.height = sh;
      }

      const detectEvery = scanning ? DETECT_SCAN_MS : DETECT_READY_MS;
      if (now - lastDetectRef.current >= detectEvery) {
        lastDetectRef.current = now;
        const det = lmApi.detectForVideo(video, now).faceLandmarks[0];
        lastLmRef.current = det ?? null;
      }
      const face = lastLmRef.current;

      const ow = overlay.width || video.videoWidth || 640;
      const oh = overlay.height || video.videoHeight || 480;
      const octx = overlay.getContext("2d")!;
      octx.clearRect(0, 0, ow, oh);

      let fused: [number, number, number] | null = null;

      if (face) {
        const oval = faceOval(face, ow, oh);

        if (scanning) {
          // Lightweight overlay: oval + progress ring only
          octx.shadowColor = "rgba(94, 234, 212, 0.55)";
          octx.shadowBlur = Math.max(12, ow * 0.03);
          octx.strokeStyle = "rgba(94, 234, 212, 0.95)";
          octx.lineWidth = Math.max(2.5, ow * 0.005);
          octx.beginPath();
          octx.ellipse(oval.cx, oval.cy, oval.rx, oval.ry, 0, 0, Math.PI * 2);
          octx.stroke();
          octx.shadowBlur = 0;
          drawProgressRing(octx, oval.cx, oval.cy, oval.rx, oval.ry, progressRef.current);

          frameCtx.drawImage(video, 0, 0, sw, sh);
          const samplePolys = namedRoiPolygons(face, sw, sh);
          const sample = sampleRoiRgb(frameCtx, maskCtx, Object.values(samplePolys));
          if (sample) fused = sample.fused;
        } else {
          const named = namedRoiPolygons(face, ow, oh);
          const polys = Object.values(named);
          const qProbe = assessQuality({
            landmarks: face,
            fusedRgb: null,
            regionRgb: {},
            frame: null,
            sampleW: sw,
            sampleH: sh,
            now,
          });
          octx.strokeStyle = guideColor(qProbe);
          octx.lineWidth = Math.max(2, ow * 0.004);
          octx.beginPath();
          octx.ellipse(oval.cx, oval.cy, oval.rx, oval.ry, 0, 0, Math.PI * 2);
          octx.stroke();

          octx.fillStyle = "rgba(94, 234, 212, 0.18)";
          octx.strokeStyle = "rgba(94, 234, 212, 0.9)";
          octx.lineWidth = Math.max(1.5, ow * 0.0025);
          for (const poly of polys) {
            octx.beginPath();
            poly.forEach((p, i) => (i === 0 ? octx.moveTo(p.x, p.y) : octx.lineTo(p.x, p.y)));
            octx.closePath();
            octx.fill();
            octx.stroke();
          }

          frameCtx.drawImage(video, 0, 0, sw, sh);
          const samplePolys = namedRoiPolygons(face, sw, sh);
          const sample = sampleRoiRgb(
            frameCtx,
            maskCtx,
            Object.values(samplePolys),
            samplePolys,
          );
          const regionRgb = sample?.regions ?? {};
          if (sample) fused = sample.fused;

          const q = assessQuality({
            landmarks: face,
            fusedRgb: fused,
            regionRgb,
            frame: frameCtx,
            sampleW: sw,
            sampleH: sh,
            now,
          });
          setQuality(q);
        }
      } else if (!scanning) {
        octx.strokeStyle = "rgba(255,255,255,0.4)";
        octx.lineWidth = Math.max(2, ow * 0.004);
        octx.beginPath();
        octx.ellipse(ow * 0.5, oh * 0.48, ow * 0.22, oh * 0.32, 0, 0, Math.PI * 2);
        octx.stroke();
        setQuality({ ...emptyQ, tip: "Move into the frame until your face is detected." });
      }

      if (scanning) {
        const s = samplesRef.current;
        s.start ??= now;
        if (fused) {
          s.t.push(now);
          s.rgb.push(fused);
        } else {
          s.missed++;
        }
        const elapsed = (now - s.start) / 1000;
        const bySamples = s.t.length / TARGET_SAMPLES;
        const byTime = elapsed / (extendingRef.current ? MAX_SECONDS : TARGET_SECONDS);
        const prog = Math.min(1, Math.max(bySamples, byTime * 0.5));
        progressRef.current = prog;

        // Throttle React HUD updates (~4 Hz)
        if (now - lastHudRef.current > 250) {
          lastHudRef.current = now;
          setSampleCount(s.t.length);
          setScanProgress(prog);
          const target = extendingRef.current ? MAX_SECONDS : TARGET_SECONDS;
          setSecondsLeft(Math.max(0, Math.ceil(target - elapsed)));
        }

        if (elapsed >= 10 && s.t.length > 60 && now - lastLiveHrRef.current > 2000) {
          lastLiveHrRef.current = now;
          const bpm = liveHrEstimate(
            s.t.map((t) => t - s.t[0]),
            s.rgb,
          );
          if (bpm !== null) setLiveBpm(bpm);
        }

        // Extend early if short on samples
        if (elapsed >= 25 && s.t.length < TARGET_SAMPLES && !extendingRef.current) {
          extendingRef.current = true;
          setExtending(true);
        }

        if (s.t.length >= TARGET_SAMPLES && elapsed >= 20) {
          void submit();
          return;
        }
        if (elapsed >= TARGET_SECONDS && !extendingRef.current) {
          if (s.t.length >= TARGET_SAMPLES) {
            void submit();
            return;
          }
          extendingRef.current = true;
          setExtending(true);
        } else if (elapsed >= MAX_SECONDS) {
          void submit();
          return;
        }
      }
      schedule(tick);
    };
    schedule(tick);
  }

  async function beginScan() {
    samplesRef.current = { t: [], rgb: [], missed: 0, start: null };
    setSecondsLeft(TARGET_SECONDS);
    extendingRef.current = false;
    setExtending(false);
    setLiveBpm(null);
    setSampleCount(0);
    setScanProgress(0);
    progressRef.current = 0;
    lastLiveHrRef.current = 0;
    scanningRef.current = true;
    setPhase("scanning");
    syncOverlaySize(true);
    await requestWakeLock();
    await requestFullscreen();
  }

  async function submit() {
    stopCamera();
    setPhase("processing");
    const s = samplesRef.current;
    const total = s.t.length + s.missed;
    const faceFrac = total ? s.t.length / total : 0;
    if (s.missed > 0.35 * total)
      return fail(
        "Your face was not visible for much of the scan. Keep your face centred and try again.",
      );
    const span = s.t.length >= 2 ? (s.t[s.t.length - 1] - s.t[0]) / 1000 : 0;
    const fps = span > 0 ? s.t.length / span : 0;
    if (s.t.length < MIN_SAMPLES)
      return fail(
        `Not enough signal samples (${s.t.length}). Close other tabs, set brightness to max, hold still, and try again.`,
      );
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const t0 = s.t[0];
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({
          t_ms: s.t.map((t) => t - t0),
          rgb: s.rgb,
          face_frac: faceFrac,
          measured_fps: fps,
        }),
      });
      if (res.status === 401) return fail("Your session expired. Please sign in again.");
      if (!res.ok)
        return fail(
          res.status === 422
            ? "The scan data was not usable. Please try again."
            : "Server error. Please try again in a moment.",
        );
      setResult((await res.json()) as HrResult);
      setPhase("result");
      try {
        navigator.vibrate?.(40);
      } catch {
        /* ignore */
      }
    } catch {
      fail("Network error. Check your connection and try again.");
    }
  }

  async function sendFeedback() {
    if (!result || !accuracy || experience < 1) return;
    setFeedbackBusy(true);
    try {
      const s = samplesRef.current;
      const t0 = s.t[0] ?? 0;
      await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_id: result.scan_id,
          hr_bpm: result.hr_bpm,
          hr_lo: result.hr_lo,
          hr_hi: result.hr_hi,
          confidence: result.confidence,
          confidence_label: result.confidence_label,
          sqi: result.sqi,
          accuracy,
          experience,
          reference_bpm: refBpm ? Number(refBpm) : null,
          reference_device: refDevice || null,
          comment: comment || null,
          trace_consent: traceConsent,
          trace: traceConsent ? { t_ms: s.t.map((t) => t - t0), rgb: s.rgb } : null,
          device_class: deviceClass(),
          app_version: APP_VERSION,
        }),
      });
      setFeedbackDone(true);
    } catch {
      setFeedbackDone(true);
    } finally {
      setFeedbackBusy(false);
    }
  }

  const showCamera =
    phase === "loading" || phase === "ready" || phase === "scanning" || phase === "consent";
  const startOk = canStartScan(quality, eyewearOverride) && brightOk;
  const mirror = facing === "user";
  const illuminate = phase === "scanning" && facing === "user";

  return (
    <div className={`fh-scan fh-fade${illuminate ? " fh-illuminate" : ""}`}>
      <aside className="fh-scan-side">
        {phase === "consent" && (
          <div>
            <p className="fh-kicker">Scan setup</p>
            <h1 className="fh-title" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}>
              About 30 seconds
            </h1>
            <div className="fh-panel" style={{ marginTop: "1.1rem", padding: "1rem 1.05rem" }}>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Sit upright facing the screen. Set brightness to maximum — bright edges help light
                your face. Stay still; we may continue a bit longer on slower phones.
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
            <label className="fh-check fh-panel" style={{ marginTop: "0.75rem", padding: "1rem" }}>
              <input
                type="checkbox"
                checked={brightOk}
                onChange={(e) => setBrightOk(e.target.checked)}
              />
              <span>I set my screen brightness to maximum.</span>
            </label>
            <button
              className="fh-btn fh-btn-primary"
              style={{ marginTop: "1rem", width: "100%" }}
              disabled={!agreed || !brightOk}
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
              {phase === "scanning"
                ? extending
                  ? "Still capturing… hold still"
                  : `${secondsLeft}s left`
                : "Ready when you are"}
            </h2>
            {phase !== "scanning" && (
              <div className="fh-cam-toggle" role="group" aria-label="Camera">
                <button
                  type="button"
                  className={facing === "user" ? "active" : ""}
                  onClick={() => switchFacing("user")}
                >
                  Front
                </button>
                <button
                  type="button"
                  className={facing === "environment" ? "active" : ""}
                  onClick={() => switchFacing("environment")}
                >
                  Back
                </button>
                {torchSupported && (
                  <button type="button" className={torchOn ? "active" : ""} onClick={toggleTorch}>
                    {torchOn ? "Light on" : "Light off"}
                  </button>
                )}
              </div>
            )}
            {facing === "user" && phase === "ready" && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                Face the screen. Bright edges help light your face.
              </p>
            )}
            {phase === "scanning" && (
              <>
                <p className="fh-scan-status" aria-live="polite">
                  Analysing skin colour changes…
                </p>
                {liveBpm !== null && (
                  <p className="fh-live-bpm">Live estimate · ~{liveBpm} BPM</p>
                )}
                <div className="fh-scan-meters">
                  <div>
                    <span>Signal samples</span>
                    <strong>
                      {sampleCount}/{TARGET_SAMPLES}
                    </strong>
                  </div>
                  <div className="fh-scan-bar" aria-hidden>
                    <span style={{ width: `${scanProgress * 100}%` }} />
                  </div>
                </div>
              </>
            )}
            {phase !== "scanning" && (
              <ul className="fh-checklist" aria-label="Scan readiness">
                {(
                  [
                    ["Face", quality.face],
                    ["Framing", quality.framing],
                    ["Lighting", quality.lighting],
                    ["Still", quality.stillness],
                    ["Eyewear", quality.eyewear || eyewearOverride],
                  ] as const
                ).map(([label, ok]) => (
                  <li key={label} className={ok ? "ok" : "bad"}>
                    <span aria-hidden>{ok ? "●" : "○"}</span> {label}
                  </li>
                ))}
              </ul>
            )}
            {quality.tip && phase === "ready" && (
              <p style={{ marginTop: "0.6rem", color: "var(--muted)", fontSize: "0.88rem" }}>
                {quality.tip}
              </p>
            )}
            {!quality.eyewear && !eyewearOverride && phase === "ready" && (
              <button
                type="button"
                className="fh-linkish"
                onClick={() => setEyewearOverride(true)}
              >
                My face is clear, continue
              </button>
            )}
            {phase === "ready" && (
              <button
                className="fh-btn fh-btn-primary"
                style={{ marginTop: "1.1rem", width: "100%" }}
                disabled={!startOk}
                onClick={beginScan}
              >
                Start scan
              </button>
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
                {result.hr_lo !== null && result.hr_hi !== null && (
                  <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                    Likely range {result.hr_lo}–{result.hr_hi} BPM
                  </p>
                )}
                <div className="fh-conf">
                  <div className="fh-conf-bar" aria-hidden>
                    <span style={{ width: `${result.confidence}%` }} />
                  </div>
                  <span
                    className={`fh-tag${result.confidence_label === "Low" ? " fh-tag-warn" : ""}`}
                  >
                    Confidence · {result.confidence_label} ({result.confidence})
                  </span>
                  <p style={{ margin: "0.45rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {result.confidence_reason}
                  </p>
                </div>
                <Waveform values={result.waveform} />
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

            {!feedbackDone ? (
              <div className="fh-feedback fh-panel" style={{ marginTop: "1.1rem", padding: "1rem" }}>
                <p className="fh-kicker" style={{ marginTop: 0 }}>
                  Quick feedback
                </p>
                <label className="fh-field">
                  How accurate did this feel?
                  <select value={accuracy} onChange={(e) => setAccuracy(e.target.value)}>
                    <option value="">Choose…</option>
                    <option value="accurate">Accurate</option>
                    <option value="slightly_off">Slightly off</option>
                    <option value="way_off">Way off</option>
                    <option value="not_sure">Not sure</option>
                  </select>
                </label>
                <label className="fh-field">
                  Experience (1–5)
                  <select
                    value={experience || ""}
                    onChange={(e) => setExperience(Number(e.target.value))}
                  >
                    <option value="">Choose…</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fh-field">
                  Reference reading (optional)
                  <input
                    type="number"
                    min={30}
                    max={220}
                    placeholder="BPM from watch / oximeter"
                    value={refBpm}
                    onChange={(e) => setRefBpm(e.target.value)}
                  />
                </label>
                <label className="fh-field">
                  Reference device (optional)
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Apple Watch"
                    value={refDevice}
                    onChange={(e) => setRefDevice(e.target.value)}
                  />
                </label>
                <label className="fh-field">
                  Comment (optional)
                  <textarea
                    maxLength={500}
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <label className="fh-check" style={{ marginTop: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={traceConsent}
                    onChange={(e) => setTraceConsent(e.target.checked)}
                  />
                  <span>
                    Share anonymous colour-signal data to improve FaceHealth (off by default)
                  </span>
                </label>
                <button
                  className="fh-btn fh-btn-primary"
                  style={{ marginTop: "0.9rem", width: "100%" }}
                  disabled={!accuracy || experience < 1 || feedbackBusy}
                  onClick={sendFeedback}
                >
                  {feedbackBusy ? "Sending…" : "Send feedback"}
                </button>
              </div>
            ) : (
              <p style={{ marginTop: "1rem", color: "var(--ok)" }}>Thanks — feedback saved.</p>
            )}

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

      <div className={showCamera ? undefined : "hidden"}>
        <div
          ref={camWrapRef}
          className={`fh-cam${mirror ? " fh-cam-mirror" : " fh-cam-nomirror"}${illuminate ? " fh-cam-lit" : ""}${phase === "scanning" ? " fh-cam-scanning" : ""}`}
        >
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} />
          {phase === "scanning" && <div className="fh-scan-sweep" aria-hidden />}
          {showCamera && (
            <div className="fh-cam-hud">
              {phase === "loading" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <div className="fh-spin" />
                  <span>Opening camera…</span>
                </div>
              )}
              {phase === "ready" && (
                <span>{quality.face ? "Face in frame" : "Looking for face…"}</span>
              )}
              {phase === "scanning" && (
                <div className="fh-cam-hud-scan">
                  <span className="fh-chip">Capturing signal</span>
                  <span className="fh-chip">{sampleCount} samples</span>
                  {liveBpm !== null && <span className="fh-chip">~{liveBpm} BPM</span>}
                  <strong className="fh-cam-timer">{secondsLeft}s</strong>
                </div>
              )}
              {phase === "consent" && (
                <span>Your camera view appears here after you enable access</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Waveform({ values }: { values: number[] }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 280;
  const h = 56;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className="fh-wave"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Pulse waveform"
    >
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={pts} />
    </svg>
  );
}
