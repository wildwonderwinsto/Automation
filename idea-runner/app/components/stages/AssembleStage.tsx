import { useState, useEffect } from "react";
import { Scene } from "../../types";
import {
  CheckCircle2,
  Loader2,
  Film,
  Image as ImageIcon,
  Volume2,
  Subtitles,
  Download,
  RotateCcw,
  ArrowRight,
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
  onRestart: () => void;
};

export function AssembleStage({ scenes, audioUrl, srtBlocks, onRestart }: Props) {
  const [status, setStatus] = useState<
    "idle" | "assembling" | "done" | "error"
  >("idle");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") {
      handleAssemble();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAssemble() {
    if (status === "assembling") return;
    setStatus("assembling");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/assemble-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, srtBlocks, audioUrl }),
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

  if (status === "assembling") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-center">
          <p className="animate-pulse mb-1">Assembling final video with FFmpeg...</p>
          <p className="text-xs opacity-70">
            Mapping images → timestamps → audio → captions
          </p>
          <p className="text-[10px] text-muted mt-2">This may take 10-20 seconds.</p>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="card-interactive rounded-card border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-red-500 font-medium">Failed to assemble video</p>
        <p className="text-muted text-xs bg-white/50 p-2 rounded border border-red-500/20 max-w-md break-all">{errorMsg}</p>
        <button
          onClick={handleAssemble}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Final Assembly
          </span>
          {status === "done" && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Complete
            </span>
          )}
        </div>

        {/* Success banner */}
        <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-8 text-center space-y-4 mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Film className="h-8 w-8 text-accent" />
          </div>
          <h3 className="font-display text-lg font-medium text-ink">
            Video Ready 🎉
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Your video has been assembled from {scenes.length} scenes with
            voice-over and burned-in captions.
          </p>
          <a 
            href={finalVideoUrl || "#"} 
            target="_blank" 
            download="final_video.mp4"
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30]"
          >
            <Download className="h-4 w-4" />
            Download final_video.mp4
          </a>
        </div>

        {/* Assembly summary */}
        <div className="rounded-lg border border-line bg-surface p-4 space-y-4">
          <span className="font-mono text-xs text-muted block">
            Assembly Summary
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-line bg-white p-3 flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">
                  {scenes.length} images
                </p>
                <p className="text-[11px] text-muted">Selected scenes</p>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-white p-3 flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">Voice-over</p>
                <p className="text-[11px] text-muted">Silences removed</p>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-white p-3 flex items-center gap-3">
              <Subtitles className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">
                  {srtBlocks.length} captions
                </p>
                <p className="text-[11px] text-muted">Burned-in .srt</p>
              </div>
            </div>
          </div>

          {/* Timeline preview */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-muted block">
              Timeline
            </span>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {scenes.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="shrink-0 rounded-md border border-line bg-white overflow-hidden"
                  style={{ width: `${Math.max(80, 100)}px` }}
                >
                  {scene.selected_image ? (
                    <img
                      src={scene.selected_image}
                      alt={`Scene ${scene.scene_id}`}
                      className="w-full h-12 object-cover"
                    />
                  ) : (
                    <div className="w-full h-12 bg-surface flex items-center justify-center">
                      <ImageIcon className="h-3 w-3 text-muted" />
                    </div>
                  )}
                  <div className="px-1.5 py-1">
                    <p className="font-mono text-[9px] text-muted truncate">
                      S{scene.scene_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleAssemble}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Re-assemble
          </button>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-accent/90"
          >
            Complete & Start New
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
