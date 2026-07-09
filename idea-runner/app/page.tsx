"use client";

import { useState } from "react";
import { StageNavigation } from "./components/layout/StageNavigation";
import { NotesPanel } from "./components/shared/NotesPanel";
import { ScriptStage } from "./components/stages/ScriptStage";
import { SceneStage } from "./components/stages/SceneStage";
import { Note, Scene } from "./types";

export default function Home() {
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [completedStageIds, setCompletedStageIds] = useState<number[]>([]);

  const [notes, setNotes] = useState<Note[]>([]);

  // Stage 1 State
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");

  // Stage 2 State
  const [scenes, setScenes] = useState<Scene[]>([]);

  function handleAddNote(text: string) {
    setNotes([
      { id: crypto.randomUUID(), text, ts: Date.now() },
      ...notes,
    ]);
  }

  function handleDeleteNote(id: string) {
    setNotes(notes.filter((n: Note) => n.id !== id));
  }

  function handleScriptApprove() {
    if (!completedStageIds.includes(1)) {
      setCompletedStageIds([...completedStageIds, 1]);
    }
    setCurrentStageId(2);
  }

  function handleSceneApprove() {
    if (!completedStageIds.includes(2)) {
      setCompletedStageIds([...completedStageIds, 2]);
    }
    // Advance to stage 3 once implemented
    // setCurrentStageId(3);
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
            {currentStageId === 1 ? "Topic to script" : "Script to scenes"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Stage {currentStageId} of 6 — everything else in the pipeline waits on this.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr_320px]">
          <StageNavigation
            currentStageId={currentStageId}
            completedStageIds={completedStageIds}
          />

          {currentStageId === 1 && (
            <ScriptStage
              topic={topic}
              onTopicChange={setTopic}
              script={script}
              onScriptChange={setScript}
              isApproved={completedStageIds.includes(1)}
              onApprove={handleScriptApprove}
            />
          )}

          {currentStageId === 2 && (
            <SceneStage
              script={script}
              scenes={scenes}
              onScenesChange={setScenes}
              isApproved={completedStageIds.includes(2)}
              onApprove={handleSceneApprove}
            />
          )}

          {currentStageId > 2 && (
            <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex items-center justify-center text-muted text-sm">
              Stage {currentStageId} UI coming soon...
            </section>
          )}

          <NotesPanel
            notes={notes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </div>
    </main>
  );
}
