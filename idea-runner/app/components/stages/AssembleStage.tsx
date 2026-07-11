import { useState } from "react";
import { Scene, SceneTiming, CaptionStyle } from "../../types";
import {
  CheckCircle2,
  Loader2,
  Film,
  Download,
  RotateCcw,
  Sparkles,
  Play,
  Monitor,
  MonitorSmartphone,
} from "lucide-react";

type SrtBlock = {
  index: number;
  start: string;
  end: string;
  text: string;
};

type Props = {
  scenes: Scene[];
  audioUrl: string | null;
  srtBlocks: SrtBlock[];
  sceneTimings: SceneTiming[];
  captionStyle: CaptionStyle;
  onRestart: () => void;
};

export function AssembleStage({ scenes, audioUrl, srtBlocks, sceneTimings, captionStyle, onRestart }: Props) {
  const [status, setStatus] = useState<
    "config" | "assembling" | "done" | "error"
  >("config");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"1080p" | "4k">("1080p");

  async function handleAssemble() {
    if (status === "assembling") return;
    setStatus("assembling");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/assemble-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, srtBlocks, sceneTimings, audioUrl, resolution, captionStyle }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFinalVideoUrl(data.videoUrl);
      setStatus("done");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to assemble video");
      setStatus("error");
    }
  }

  /* ───────── Assembling state ───────── */
  if (status === "assembling") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-8 sm:p-12 flex flex-col items-center justify-center gap-5 text-sm text-muted min-h-[320px]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
            <Film className="h-7 w-7 text-accent animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-ink font-medium text-base">Rendering your video...</p>
          <p className="text-xs text-muted max-w-xs mx-auto">
            FFmpeg is stitching {scenes.length} scenes with voiceover and burned-in captions at {resolution === "4k" ? "4K" : "1080p"} 60fps.
          </p>
          <p className="text-[10px] text-muted/60 mt-3">This usually takes 10–30 seconds</p>
        </div>
      </section>
    );
  }

  /* ───────── Error state ───────── */
  if (status === "error") {
    return (
      <section className="card-interactive rounded-card border border-red-500/20 bg-surfaceRaised p-8 flex flex-col items-center justify-center gap-4 text-sm min-h-[280px]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200">
          <RotateCcw className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-ink font-medium">Assembly failed</p>
        <p className="text-muted text-xs bg-red-50/50 p-3 rounded-lg border border-red-100 max-w-md break-all leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => { setStatus("config"); }}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30] transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Go Back
        </button>
      </section>
    );
  }

  /* ───────── Config: choose resolution & render ───────── */
  if (status === "config") {
    return (
      <section className="space-y-4 w-full min-w-0">
        <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Final Assembly
            </span>
          </div>

          {/* Hero */}
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-display text-lg font-medium text-ink">
              Ready to render
            </h3>
            <p className="text-sm text-muted max-w-sm mx-auto">
              {scenes.length} scenes, voiceover, and captions are ready. Pick your resolution and hit render.
            </p>
          </div>

          {/* Resolution picker */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-8">
            <button
              onClick={() => setResolution("1080p")}
              className={`relative rounded-xl border-2 p-4 sm:p-5 text-left transition-all ${
                resolution === "1080p"
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-line bg-white hover:border-muted"
              }`}
            >
              {resolution === "1080p" && (
                <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-accent" />
              )}
              <Monitor className="h-5 w-5 text-ink mb-2" />
              <p className="font-medium text-sm text-ink">1080p</p>
              <p className="text-xs text-muted mt-0.5">Full HD · 60fps</p>
              <p className="text-[10px] text-muted/70 mt-1">Recommended</p>
            </button>
            <button
              onClick={() => setResolution("4k")}
              className={`relative rounded-xl border-2 p-4 sm:p-5 text-left transition-all ${
                resolution === "4k"
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-line bg-white hover:border-muted"
              }`}
            >
              {resolution === "4k" && (
                <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-accent" />
              )}
              <MonitorSmartphone className="h-5 w-5 text-ink mb-2" />
              <p className="font-medium text-sm text-ink">4K</p>
              <p className="text-xs text-muted mt-0.5">Ultra HD · 60fps</p>
              <p className="text-[10px] text-muted/70 mt-1">Slower render</p>
            </button>
          </div>

          {/* Caption style summary */}
          <div className="max-w-md mx-auto mb-8 rounded-xl border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-3">Caption Settings</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted">Font</span>
              <span className="text-ink font-medium text-right" style={{ fontFamily: captionStyle.fontFamily }}>{captionStyle.fontFamily}</span>
              <span className="text-muted">Size</span>
              <span className="text-ink font-medium text-right capitalize">{captionStyle.fontSize}</span>
              <span className="text-muted">Position</span>
              <span className="text-ink font-medium text-right capitalize">{captionStyle.position}</span>
              <span className="text-muted">Transition</span>
              <span className="text-ink font-medium text-right capitalize">{captionStyle.transition}</span>
              <span className="text-muted">Words/caption</span>
              <span className="text-ink font-medium text-right">{captionStyle.wordsPerCaption === "max" ? "Max (per scene)" : captionStyle.wordsPerCaption}</span>
            </div>
            <p className="text-[10px] text-muted/70 mt-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Rendered via ASS format — preview-accurate
            </p>
          </div>

          {/* Render button */}
          <div className="flex justify-center">
            <button
              onClick={handleAssemble}
              className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-3 text-sm font-medium text-white hover:bg-accent-hover hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              Render Video
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ───────── Done: video player + download ───────── */
  return (
    <section className="space-y-4 w-full min-w-0">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-4 sm:p-6">
        <div className="mb-4 sm:mb-5 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Your Video
          </span>
          <span className="animate-pop-in inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
            Rendered · {resolution === "4k" ? "4K" : "1080p"} 60fps
          </span>
        </div>

        {/* Video player */}
        {finalVideoUrl && (
          <div className="mb-5 sm:mb-6 rounded-xl overflow-hidden border border-line bg-black shadow-sm">
            <video
              key={finalVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[55vh] object-contain"
              style={{ aspectRatio: "16/9" }}
            >
              <source src={finalVideoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          <a
            href={finalVideoUrl || "#"}
            target="_blank"
            download="final_video.mp4"
            className="sm:col-span-2 group relative flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-ink px-6 py-4 text-sm font-medium text-white transition-all hover:bg-black hover:shadow-xl active:scale-[0.99]"
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 animate-[shimmer_2s_infinite]"
              style={{ backgroundSize: "200% 100%" }}
            />
            <Download className="h-5 w-5 relative z-10" />
            <span className="relative z-10 text-base">Download Video</span>
          </a>

          <button
            onClick={() => {
              setFinalVideoUrl(null);
              setStatus("config");
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3.5 text-sm font-medium text-ink hover:border-accent hover:bg-accent/5 hover:text-accent transition-all active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4" />
            Re-render
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3.5 text-sm font-medium text-ink hover:border-muted hover:bg-surface transition-all active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4" />
            Start New Project
          </button>
        </div>
      </div>
    </section>
  );
}
