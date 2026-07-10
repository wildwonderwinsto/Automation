import { useState, useEffect } from "react";
import { Scene } from "../../types";
import { Check, CheckCircle2, Wand2, Loader2, Subtitles } from "lucide-react";

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
  onSrtGenerated: (blocks: SrtBlock[]) => void;
  isApproved: boolean;
  onApprove: () => void;
};

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function CaptionsStage({
  scenes,
  audioUrl,
  srtBlocks,
  onSrtGenerated,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    srtBlocks.length > 0 ? "ready" : "idle"
  );

  useEffect(() => {
    if (status === "idle" && scenes.length > 0) {
      handleGenerateSrt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerateSrt() {
    if (status === "generating") return;
    setStatus("generating");

    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate captions");

      onSrtGenerated(data.srtBlocks);
      setStatus("ready");
    } catch (err: any) {
      console.error(err);
      setStatus("idle");
      alert(err.message);
    }
  }

  function blocksToSrtString(blocks: SrtBlock[]): string {
    return blocks
      .map((b) => `${b.index}\n${b.start} --> ${b.end}\n${b.text}`)
      .join("\n\n");
  }

  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-center">
          <p className="animate-pulse mb-1">Transcribing audio with AI...</p>
          <p className="text-xs opacity-70">Aligning timestamps to scene boundaries...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Generated Captions (.srt)
          </span>
          {isApproved && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Approved
            </span>
          )}
        </div>

        {/* Visual timeline view */}
        <div className="space-y-3 mb-6">
          {srtBlocks.map((block) => (
            <div
              key={block.index}
              className="rounded-lg border border-line bg-surface p-4 flex items-start gap-4"
            >
              <div className="shrink-0 flex flex-col items-center gap-1">
                <Subtitles className="h-4 w-4 text-accent" />
                <span className="font-mono text-[10px] text-muted">#{block.index}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-relaxed">{block.text}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {block.start} → {block.end}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Raw SRT preview */}
        <details className="rounded-lg border border-line bg-white">
          <summary className="cursor-pointer px-4 py-3 text-xs font-mono text-muted hover:text-ink select-none">
            View raw .srt file
          </summary>
          <pre className="px-4 pb-4 text-xs text-ink leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
            {blocksToSrtString(srtBlocks)}
          </pre>
        </details>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={handleGenerateSrt}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate Captions
          </button>
          <button
            onClick={onApprove}
            disabled={srtBlocks.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Approve captions
          </button>
        </div>
      </div>
    </section>
  );
}
