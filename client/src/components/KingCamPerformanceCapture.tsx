import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Circle, Loader2, RotateCcw, ShieldCheck, Square, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";

type CaptureState = "idle" | "camera" | "recording" | "uploading" | "ready" | "error";

const captureMarks = [
  "Keep your full body in the frame — crown to shoes.",
  "Give the camera real movement: walk two relaxed steps, shift your weight, then settle.",
  "Speak naturally for 15–30 seconds. Your real performance becomes the clone’s motion control.",
];

const performanceRoles = [
  { value: "presence", label: "Crown-and-suit presence", help: "Stand tall, show the full KingCam look, and let the camera hold your presence." },
  { value: "gait", label: "Natural gait and weight", help: "Walk naturally, shift your weight, and let both shoes stay visible." },
  { value: "hands_and_prop", label: "Hands and prop control", help: "Show natural hand movement and how you hold a real prop." },
  { value: "direct_delivery", label: "Direct-to-camera delivery", help: "Look into the camera and speak with your real KingCam energy." },
  { value: "reaction", label: "Reaction and listening", help: "Show calm listening, small reactions, gaze changes, and natural pauses." },
  { value: "combined_performance", label: "Combined KingCam performance", help: "Bring several pieces together in one uninterrupted real take." },
] as const;

function recorderMimeType() {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return options.find((mime) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) || "";
}

export function KingCamPerformanceCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<CaptureState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedAssetId, setCapturedAssetId] = useState<string | null>(null);
  const [reviewChecks, setReviewChecks] = useState({ fullBody: false, naturalMotion: false, directSpeech: false });
  const [reviewNotes, setReviewNotes] = useState("");
  const [performanceRole, setPerformanceRole] = useState<(typeof performanceRoles)[number]["value"]>("combined_performance");
  const timerRef = useRef<number | null>(null);
  const register = trpc.kingcamCloneOperatingSystem.registerPerformanceCapture.useMutation({
    onSuccess: (result) => {
      setCapturedAssetId(result.capture.mediaAssetId);
      setState("ready");
      setNotice("Your real full-body performance is secured in KingCam’s clone vault. Watch it back, then personally confirm whether it can become the one motion driver.");
    },
    onError: (error) => {
      setState("error");
      setNotice(error.message);
    },
  });
  const reviewCapture = trpc.kingcamCloneOperatingSystem.reviewPerformanceCapture.useMutation({
    onSuccess: () => {
      setNotice("KingCam’s real motion driver is now ready for one governed benchmark. That benchmark still has to make a watchable video and pass review before any public clone claim.");
    },
    onError: (error) => setNotice(error.message),
  });

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => {
    clearTimer();
    stopTracks();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openCamera = async () => {
    try {
      setNotice(null);
      setPreviewUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080, min: 720 },
          height: { ideal: 1920, min: 720 },
          frameRate: { ideal: 30, min: 24 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("camera");
    } catch {
      setState("error");
      setNotice("KingCam Performance Capture needs your camera and microphone to make the real full-body driver.");
    }
  };

  const uploadTake = async (blob: Blob) => {
    setState("uploading");
    try {
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `kingcam-real-performance-${Date.now()}.${extension}`, { type: blob.type || "video/webm" });
      const form = new FormData();
      form.append("file", file);
      const uploaded = await new Promise<{ mediaAssetId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/video/upload/direct");
        xhr.withCredentials = true;
        xhr.setRequestHeader("x-creatorvault-source-classification", "kingcam_performance_capture");
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`Performance vault upload stopped (${xhr.status}).`));
            return;
          }
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error("CreatorVault did not return a verified performance receipt.")); }
        };
        xhr.onerror = () => reject(new Error("The performance take could not reach CreatorVault."));
        xhr.send(form);
      });
      if (!uploaded.mediaAssetId) throw new Error("CreatorVault did not verify the performance receipt.");
      register.mutate({ mediaAssetId: uploaded.mediaAssetId, performanceRole });
    } catch (error) {
      setState("error");
      setNotice(error instanceof Error ? error.message : "The performance take could not be stored.");
    }
  };

  const beginTake = () => {
    const stream = streamRef.current;
    if (!stream) return openCamera();
    const mimeType = recorderMimeType();
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 7_500_000 } : { videoBitsPerSecond: 7_500_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        clearTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopTracks();
        if (blob.size < 50_000) {
          setState("error");
          setNotice("That take was too short to become KingCam’s motion driver. Keep the camera rolling while you move and speak.");
          return;
        }
        void uploadTake(blob);
      };
      recorder.start(1000);
      setSeconds(0);
      setState("recording");
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setState("error");
      setNotice("This camera cannot start the real KingCam performance take yet.");
    }
  };

  const stopTake = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const reset = () => {
    clearTimer();
    stopTracks();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedAssetId(null);
    setReviewChecks({ fullBody: false, naturalMotion: false, directSpeech: false });
    setReviewNotes("");
    setSeconds(0);
    setNotice(null);
    setState("idle");
  };

  const isLiveCamera = state === "camera" || state === "recording";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#e8bd74]/35 bg-[#120807] p-4 shadow-[0_24px_90px_rgba(0,0,0,.35)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_62%_0%,rgba(224,148,57,.28),transparent_56%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e8bd74]">KingCam performance capture</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.07em] text-[#fff5e8] sm:text-4xl">MAKE THE REAL<br /><span className="text-[#e8bd74]">MOTION DRIVER.</span></h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e8bd74]/30 bg-black/30 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#f2dba8]">
          <ShieldCheck className="h-4 w-4 text-[#e8bd74]" /> Clone-only vault
        </div>
      </div>

      <div className="relative mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-[1.65rem] border border-white/10 bg-black/35 p-5">
          <p className="text-sm font-black text-white">This is the missing piece.</p>
          <p className="mt-2 text-sm leading-6 text-white/62">Your real full-body movement—not a picture guessing how your body moves. CreatorVault locks this take to KingCam Clone and keeps it out of every other creation lane.</p>
          <div className="mt-6 space-y-4">
            {captureMarks.map((mark, index) => (
              <div key={mark} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e8bd74]/35 text-[10px] font-black text-[#e8bd74]">0{index + 1}</span>
                <p className="pt-0.5 text-sm leading-5 text-white/70">{mark}</p>
              </div>
            ))}
          </div>
          <label className="mt-7 block"><span className="text-[10px] font-black uppercase tracking-[.15em] text-[#e8bd74]">What part of KingCam are you building?</span><select value={performanceRole} onChange={(event) => setPerformanceRole(event.target.value as (typeof performanceRoles)[number]["value"])} className="mt-2 min-h-12 w-full rounded-xl border border-[#e8bd74]/25 bg-black/35 px-3 text-sm font-black text-white outline-none focus:border-[#e8bd74]/60">{performanceRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><p className="mt-2 text-xs leading-5 text-white/55">{performanceRoles.find((role) => role.value === performanceRole)?.help}</p></label><div className="mt-5 rounded-2xl border border-[#e8bd74]/20 bg-[#e8bd74]/8 p-4 text-xs leading-5 text-[#f5dfb0]">No filters. No fake motion. No Body Cinema. This is the real performance control your clone has been missing.</div>
        </div>

        <div className="relative min-h-[32rem] overflow-hidden rounded-[1.65rem] border border-white/15 bg-black">
          {previewUrl ? (
            <video src={previewUrl} controls playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <video ref={videoRef} muted playsInline className={`absolute inset-0 h-full w-full object-cover ${isLiveCamera ? "opacity-100" : "opacity-0"}`} />
          )}
          {!isLiveCamera && !previewUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(136,24,43,.46),transparent_42%),linear-gradient(160deg,#1c090b,#040303)] px-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-[#e8bd74]/40 bg-[#e8bd74]/10 text-[#e8bd74]"><Camera className="h-9 w-9" /></div>
              <p className="mt-6 text-2xl font-black tracking-[-.06em] text-white">YOUR BODY IS THE CONTROL.</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">Open the camera. Stand back. Give KingCam the real movement no image model can invent.</p>
            </div>
          )}
          {isLiveCamera && <div className="pointer-events-none absolute inset-5 rounded-[1.25rem] border border-[#e8bd74]/55"><div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#f3d69c]">crown to shoes</div></div>}
          {state === "recording" && <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-[#b8152b] px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-white"><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> {seconds}s live</div>}
          {(state === "uploading" || register.isPending) && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center"><Loader2 className="h-10 w-10 animate-spin text-[#e8bd74]" /><p className="mt-4 text-sm font-black text-[#f5dfb0]">LOCKING THE REAL TAKE INTO KINGCAM’S VAULT</p></div>}
          {state === "ready" && <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-emerald-300/35 bg-black/72 px-4 py-3 text-left backdrop-blur"><div className="flex items-center gap-2 text-sm font-black text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Real performance secured</div><p className="mt-1 text-xs leading-5 text-white/70">Watch this exact take all the way through before you decide whether it deserves motion-driver status.</p></div>}
        </div>
      </div>

      {state === "ready" && capturedAssetId && <section className="relative mt-5 rounded-[1.65rem] border border-[#e8bd74]/30 bg-black/35 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e8bd74]">Your review decides the driver</p><h3 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">Do not guess. Watch the whole take.</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Check these only if this exact recording shows your whole body from crown to shoes, natural movement, and your real spoken delivery from start to finish. If it misses any part, start a new take instead.</p><div className="mt-5 grid gap-2 md:grid-cols-3">{([{ key: "fullBody", label: "I can see crown to shoes the whole time" }, { key: "naturalMotion", label: "The movement looks natural and uninterrupted" }, { key: "directSpeech", label: "This is my real spoken delivery" }] as const).map((item) => <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm font-bold text-white"><input type="checkbox" checked={reviewChecks[item.key]} onChange={(event) => setReviewChecks((current) => ({ ...current, [item.key]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#e8bd74]" />{item.label}</label>)}</div><label className="mt-4 block"><span className="text-xs font-black text-white">What did you watch and verify?</span><textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Example: Full body stayed in frame, I took two natural steps, and the spoken words came directly from me." className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e8bd74]/60" /></label><button type="button" disabled={reviewCapture.isPending || !reviewChecks.fullBody || !reviewChecks.naturalMotion || !reviewChecks.directSpeech || reviewNotes.trim().length < 24} onClick={() => reviewCapture.mutate({ mediaAssetId: capturedAssetId, fullBodyConfirmed: true, naturalMotionConfirmed: true, directSpeechConfirmed: true, notes: reviewNotes.trim() })} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e8bd74] px-5 text-sm font-black text-[#210b08] disabled:cursor-not-allowed disabled:opacity-40">{reviewCapture.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking your real take</> : <><ShieldCheck className="h-4 w-4" /> This is the real motion driver</>}</button></section>}

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-white/62">{notice || (state === "recording" ? "Move naturally. Let the camera see your whole body and hear your real voice." : "Record one clean take. CreatorVault checks its duration, frame quality, ownership, and clone-only classification before it can be used.")}</p>
        <div className="flex flex-wrap gap-3">
          {(state === "idle" || state === "error") && <button type="button" onClick={() => void openCamera()} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e8bd74] px-5 text-sm font-black text-[#210b08]"><Camera className="h-4 w-4" /> Open the camera</button>}
          {state === "camera" && <button type="button" onClick={beginTake} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#c61c35] px-5 text-sm font-black text-white"><Circle className="h-4 w-4 fill-current" /> Start the real take</button>}
          {state === "recording" && <button type="button" onClick={stopTake} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-black/55 px-5 text-sm font-black text-white"><Square className="h-4 w-4 fill-current" /> Lock this take</button>}
          {(state === "ready" || state === "error" || previewUrl) && <button type="button" onClick={reset} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#e8bd74]/35 bg-black/30 px-5 text-sm font-black text-[#f2dba8]"><RotateCcw className="h-4 w-4" /> New take</button>}
        </div>
      </div>
    </section>
  );
}
