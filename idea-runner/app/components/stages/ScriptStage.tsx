import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check, CheckCircle2 } from "lucide-react";

type Props = {
  topic: string;
  onTopicChange: (topic: string) => void;
  script: string;
  onScriptChange: (script: string) => void;
  isApproved: boolean;
  onApprove: () => void;
};

export function ScriptStage({
  topic,
  onTopicChange,
  script,
  onScriptChange,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    script ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (status === "generating") return;
    if (!topic.trim()) return;

    setStatus("generating");
    setError(null);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onScriptChange(data.script);
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate script");
      setStatus("idle");
    }
  }

  return (
    <section className="space-y-4">
      {/* Topic input card */}
      <div className="card-interactive rounded-card border border-line bg-surfaceRaised p-6">
        <label className="font-mono text-xs uppercase tracking-wide text-muted">
          Topic or idea
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="e.g. Why discipline beats motivation"
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || status === "generating"}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "generating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Writing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate script
              </>
            )}
          </button>
        </div>
      </div>

      {/* Script output card */}
      {status !== "idle" && (
        <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Generated script
            </span>
            {isApproved && (
              <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
                <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
                Approved
              </span>
            )}
          </div>

          {status === "generating" ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted">
              <div className="h-2 w-3/4 rounded-full animate-shimmer" />
              <div
                className="h-2 w-1/2 rounded-full animate-shimmer"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="h-2 w-2/3 rounded-full animate-shimmer"
                style={{ animationDelay: "0.4s" }}
              />
              <p className="mt-2 animate-fade-in">Writing your script…</p>
            </div>
          ) : (
            <>
              <textarea
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                rows={10}
                className="animate-fade-in w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
              
              {error && (
                <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30]"
                >
                  <Check className="h-4 w-4" />
                  Approve script
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
