import { useState } from "react";
import { StickyNote, X } from "lucide-react";
import { Note } from "../../types";

type Props = {
  notes: Note[];
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
};

export function NotesPanel({ notes, onAddNote, onDeleteNote }: Props) {
  const [noteDraft, setNoteDraft] = useState("");

  function handleAdd() {
    if (!noteDraft.trim()) return;
    onAddNote(noteDraft.trim());
    setNoteDraft("");
  }

  return (
    <aside className="h-fit lg:sticky lg:top-10">
      <div className="card-interactive rounded-card border border-line bg-surfaceRaised p-5">
        <div className="mb-1 flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-note" />
          <h2 className="font-display text-sm font-medium text-ink">
            AI Training Notes
          </h2>
        </div>
        <p className="mb-4 text-xs text-muted">
          General feedback to help the AI learn and improve for future generations.
        </p>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAdd();
            }
          }}
          rows={3}
          placeholder="e.g. Make the pacing faster, use brighter colors..."
          className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-note focus:ring-1 focus:ring-note/30"
        />
        <button
          onClick={handleAdd}
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
                  onClick={() => onDeleteNote(n.id)}
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
  );
}
