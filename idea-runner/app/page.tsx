"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  CheckCircle2,
  Lock,
  StickyNote,
  X,
} from "lucide-react";

type Stage = { id: number; label: string; blurb: string };

const STAGES: Stage[] = [
  { id: 1, label: "Script", blurb: "Topic to first draft" },
  { id: 2, label: "Scenes", blurb: "Break into shots" },
  { id: 3, label: "Images", blurb: "Visuals per scene" },
  { id: 4, label: "Voice-over", blurb: "Read it aloud" },
  { id: 5, label: "Captions", blurb: "Timed subtitles" },
  { id: 6, label: "Assemble", blurb: "Stitch it together" },
];

type Note = { id: string; text: string; ts: number };

export default function Home() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [approved, setApproved] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  function handleGenerate() {
    if (!topic.trim() || status === "generating") return;
    setStatus("generating");
    setApproved(false);
    // Placeholder — swap this for a real API call later.
    setTimeout(() => {
      setScript(
        `Most people think "${topic.trim()}" comes down to willpower. It doesn't.\n\n[Placeholder draft — wire the Generate button to your script prompt when the backend is ready.]`
      );
      setStatus("ready");
    }, 1100);
  }

  function handleAddNote() {
    if (!noteDraft.trim()) return;
    setNotes([
      { id: crypto.randomUUID(), text: noteDraft.trim(), ts: Date.now() },
      ...notes,
    ]);
    setNoteDraft("");
  }

  function handleDeleteNote(id: string) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
            Idea runner
          </p>
          <h1 className="font-display text-2xl font-medium text-ink">
            Topic to script
          </h1>
          <p className="mt-1 text-sm text-muted">
            Stage 1 of 6 — everything else in the pipeline waits on this.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr_320px]">
          {/* Stage rail */}
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {STAGES.map((stage) => {
              const isActive = stage.id === 1;
              const isDone = stage.id === 1 && approved;
              return (
                <div
                  key={stage.id}
                  className={`stage-pill min-w-[150px] shrink-0 rounded-lg border px-3 py-2.5 lg:min-w-0 lg:shrink ${
                    isActive
                      ? "border-accent/30 bg-accent-soft"
                      : "border-line bg-surfaceRaised opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs ${
                        isActive ? "text-accent" : "text-muted"
                      }`}
                    >
                      {String(stage.id).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isActive ? "text-ink" : "text-muted"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isDone && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent animate-check-pulse" />
                    )}
                    {!isActive && <Lock className="h-3 w-3 text-muted" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{stage.blurb}</p>
                </div>
              );
            })}
          </nav>

          {/* Main work area */}
          <section className="space-y-4">
            {/* Topic input card */}
            <div className="card-interactive rounded-card border border-line bg-surfaceRaised p-6">
              <label className="font-mono text-xs uppercase tracking-wide text-muted">
                Topic or idea
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="e.g. Why discipline beats motivation"
                  className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
                <button
                  id="generate-btn"
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
                  {approved && (
                    <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
                      <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
                      Approved
                    </span>
                  )}
                </div>

                {status === "generating" ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted">
                    <div className="h-2 w-3/4 rounded-full animate-shimmer" />
                    <div className="h-2 w-1/2 rounded-full animate-shimmer" style={{ animationDelay: '0.2s' }} />
                    <div className="h-2 w-2/3 rounded-full animate-shimmer" style={{ animationDelay: '0.4s' }} />
                    <p className="mt-2 animate-fade-in">Writing your script…</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="script-editor"
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      rows={10}
                      className="animate-fade-in w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        id="regenerate-btn"
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </button>
                      <button
                        id="approve-btn"
                        onClick={() => setApproved(true)}
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

          {/* Notes panel */}
          <aside className="h-fit lg:sticky lg:top-10">
            <div className="card-interactive rounded-card border border-line bg-surfaceRaised p-5">
              <div className="mb-1 flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-note" />
                <h2 className="font-display text-sm font-medium text-ink">
                  Notes on this stage
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted">
                &ldquo;I like the hook, but the ending drags.&rdquo;
              </p>
              <textarea
                id="note-input"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    handleAddNote();
                }}
                rows={3}
                placeholder="I like this part, but it needs..."
                className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-note focus:ring-1 focus:ring-note/30"
              />
              <button
                id="add-note-btn"
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                className="mt-2 w-full rounded-lg border border-line py-2 text-sm text-ink hover:border-note/40 hover:bg-note-soft hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add note
              </button>

              <div className="mt-5 space-y-3">
                {notes.length === 0 && (
                  <p className="text-xs text-muted">No notes yet.</p>
                )}
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="note-card rounded-lg border border-note/20 bg-note-soft p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug text-ink">{n.text}</p>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        aria-label="Delete note"
                        className="note-delete shrink-0 text-muted hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {new Date(n.ts).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
