import { useState, useEffect } from "react";
import { Check, CheckCircle2, Wand2, Loader2, Volume2 } from "lucide-react";

type Props = {
  script: string;
  audioUrl: string | null;
  onAudioGenerated: (url: string) => void;
  isApproved: boolean;
  onApprove: () => void;
};

export function VoiceoverStage({
  script,
  audioUrl,
  onAudioGenerated,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    audioUrl ? "ready" : "idle"
  );

  useEffect(() => {
    if (status === "idle" && script) {
      handleGenerateAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGenerateAudio() {
    if (status === "generating") return;
    setStatus("generating");

    // Placeholder — Simulate AI generating audio and removing silences
    setTimeout(() => {
      // In a real app, this would be the processed audio URL
      onAudioGenerated("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      setStatus("ready");
    }, 3000);
  }

  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-center">
          <p className="animate-pulse mb-1">Synthesizing voice-over with AI...</p>
          <p className="text-xs opacity-70">Detecting and removing silences...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Voice-over Generation
          </span>
          {isApproved && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Approved
            </span>
          )}
        </div>

        {audioUrl ? (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-accent/20 bg-accent/5 p-6 flex flex-col items-center justify-center gap-4">
              <Volume2 className="h-8 w-8 text-accent opacity-80" />
              <audio controls src={audioUrl} className="w-full max-w-md">
                Your browser does not support the audio element.
              </audio>
              <p className="text-xs text-muted text-center max-w-sm mt-2">
                This audio has been automatically processed to remove silences and dead air.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface p-4 max-h-60 overflow-y-auto">
              <span className="font-mono text-xs text-muted mb-2 block">
                Script Transcript
              </span>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {script}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">No audio generated yet.</div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={handleGenerateAudio}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate Audio
          </button>
          <button
            onClick={onApprove}
            disabled={!audioUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Approve voice-over
          </button>
        </div>
      </div>
    </section>
  );
}
