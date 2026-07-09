import { useState, useEffect } from "react";
import { Scene } from "../../types";
import { Check, CheckCircle2, Wand2, Loader2 } from "lucide-react";

type Props = {
  script: string;
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  isApproved: boolean;
  onApprove: () => void;
};

export function SceneStage({
  script,
  scenes,
  onScenesChange,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    scenes.length > 0 ? "ready" : "idle"
  );

  useEffect(() => {
    if (scenes.length === 0 && status === "idle") {
      // Auto-start scene generation when mounting if we have a script
      handleGenerateScenes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGenerateScenes() {
    if (status === "generating") return;
    setStatus("generating");

    // Placeholder — Swap for API call based on `script_to_scene.md` guidelines
    setTimeout(() => {
      onScenesChange([
        {
          scene_id: 1,
          script_text: `Most people think it comes down to willpower.`,
          simple_description: "character standing with arms crossed",
        },
        {
          scene_id: 2,
          script_text: `It doesn't.`,
          simple_description: "character shaking head",
        },
        {
          scene_id: 3,
          script_text: `It's actually about designing your environment so you don't need any.`,
          simple_description: "character arranging his desk",
        },
      ]);
      setStatus("ready");
    }, 1500);
  }

  function handleDescriptionChange(id: number, val: string) {
    onScenesChange(
      scenes.map((s) =>
        s.scene_id === id ? { ...s, simple_description: val } : s
      )
    );
  }

  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="animate-pulse">Splitting script and generating scene descriptions...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Scene breakdown
          </span>
          {isApproved && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Approved
            </span>
          )}
        </div>

        <div className="space-y-4">
          {scenes.map((scene) => (
            <div
              key={scene.scene_id}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <div className="mb-2">
                <span className="font-mono text-xs text-muted mb-1 block">
                  Scene {scene.scene_id}
                </span>
                <p className="text-sm font-medium text-ink leading-relaxed">
                  &ldquo;{scene.script_text}&rdquo;
                </p>
              </div>
              <div className="mt-3">
                <label className="text-[11px] font-mono uppercase tracking-wide text-muted mb-1 block">
                  Simple Visual Description
                </label>
                <input
                  type="text"
                  value={scene.simple_description}
                  onChange={(e) =>
                    handleDescriptionChange(scene.scene_id, e.target.value)
                  }
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  placeholder="e.g. man walking next to two trees"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={handleGenerateScenes}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate Scenes
          </button>
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30]"
          >
            <Check className="h-4 w-4" />
            Approve scenes
          </button>
        </div>
      </div>
    </section>
  );
}
