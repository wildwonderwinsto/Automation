"use client";

import { useState } from "react";
import { StageNavigation } from "./components/layout/StageNavigation";
import { NotesPanel } from "./components/shared/NotesPanel";
import { ScriptStage } from "./components/stages/ScriptStage";
import { SceneStage } from "./components/stages/SceneStage";
import { ImageStage } from "./components/stages/ImageStage";
import { VoiceoverStage } from "./components/stages/VoiceoverStage";
import { CaptionsStage } from "./components/stages/CaptionsStage";
import { AssembleStage } from "./components/stages/AssembleStage";
import { Note, Scene, CaptionStyle, DEFAULT_CAPTION_STYLE } from "./types";

type SrtBlock = {
  index: number;
  start: string;
  end: string;
  text: string;
};

export default function Home() {
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [completedStageIds, setCompletedStageIds] = useState<number[]>([]);

  const [notes, setNotes] = useState<Note[]>([]);

  // Stage 1 State
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [script, setScript] = useState("");

  // Stage 2 & 3 State
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Stage 4 State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Stage 5 State
  const [srtBlocks, setSrtBlocks] = useState<SrtBlock[]>([]);

  // Stage 5 Caption Style
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);

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
    setCurrentStageId(3);
  }

  function handleImageApprove() {
    if (!completedStageIds.includes(3)) {
      setCompletedStageIds([...completedStageIds, 3]);
    }
    setCurrentStageId(4);
  }

  function handleVoiceoverApprove() {
    if (!completedStageIds.includes(4)) {
      setCompletedStageIds([...completedStageIds, 4]);
    }
    setCurrentStageId(5);
  }

  function handleCaptionsApprove() {
    if (!completedStageIds.includes(5)) {
      setCompletedStageIds([...completedStageIds, 5]);
    }
    setCurrentStageId(6);
  }

  function handleRestart() {
    setCurrentStageId(1);
    setCompletedStageIds([]);
    setTopic("");
    setDetails("");
    setScript("");
    setScenes([]);
    setAudioUrl(null);
    setSrtBlocks([]);
    setCaptionStyle(DEFAULT_CAPTION_STYLE);
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
            {currentStageId === 1 ? "Topic to script" : 
             currentStageId === 2 ? "Script to scenes" : 
             currentStageId === 3 ? "Scenes to images" :
             currentStageId === 4 ? "Voice-over" :
             currentStageId === 5 ? "Captions (.srt)" :
             "Final assembly"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {currentStageId < 6
              ? `Stage ${currentStageId} of 6 — everything else in the pipeline waits on this.`
              : "All stages complete — your video is ready."}
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
              details={details}
              onDetailsChange={setDetails}
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

          {currentStageId === 3 && (
            <ImageStage
              scenes={scenes}
              onScenesChange={setScenes}
              isApproved={completedStageIds.includes(3)}
              onApprove={handleImageApprove}
            />
          )}

          {currentStageId === 4 && (
            <VoiceoverStage
              script={script}
              audioUrl={audioUrl}
              onAudioGenerated={setAudioUrl}
              isApproved={completedStageIds.includes(4)}
              onApprove={handleVoiceoverApprove}
            />
          )}

          {currentStageId === 5 && (
            <CaptionsStage
              scenes={scenes}
              audioUrl={audioUrl}
              srtBlocks={srtBlocks}
              onSrtGenerated={setSrtBlocks}
              captionStyle={captionStyle}
              onCaptionStyleChange={setCaptionStyle}
              isApproved={completedStageIds.includes(5)}
              onApprove={handleCaptionsApprove}
            />
          )}

          {currentStageId === 6 && (
            <AssembleStage
              scenes={scenes}
              audioUrl={audioUrl}
              srtBlocks={srtBlocks}
              captionStyle={captionStyle}
              onRestart={handleRestart}
            />
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
