import { useState, useEffect } from "react";
import { Scene } from "../../types";
import { Check, CheckCircle2, Wand2, Loader2, Image as ImageIcon } from "lucide-react";

type Props = {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  isApproved: boolean;
  onApprove: () => void;
};

export function ImageStage({
  scenes,
  onScenesChange,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    scenes.some(s => s.generated_images && s.generated_images.length > 0) ? "ready" : "idle"
  );

  useEffect(() => {
    if (status === "idle" && scenes.length > 0) {
      handleGenerateImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGenerateImages() {
    if (status === "generating") return;
    setStatus("generating");

    // Placeholder — Simulate AI generating images
    setTimeout(() => {
      onScenesChange(
        scenes.map((scene) => ({
          ...scene,
          // Generate 2 mock placeholder images using dummyimage
          generated_images: [
            `https://dummyimage.com/600x400/2a2d30/ffffff&text=Scene+${scene.scene_id}+-+V1`,
            `https://dummyimage.com/600x400/0E7C66/ffffff&text=Scene+${scene.scene_id}+-+V2`,
          ],
          selected_image: undefined, // Reset selection if regenerating
        }))
      );
      setStatus("ready");
    }, 2500);
  }

  function handleSelectImage(sceneId: number, imageSrc: string) {
    onScenesChange(
      scenes.map((s) =>
        s.scene_id === sceneId ? { ...s, selected_image: imageSrc } : s
      )
    );
  }

  const allSelected = scenes.every((s) => !!s.selected_image);

  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="animate-pulse">Generating 2 image variations per scene using Google Whisk...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Choose Best Image
          </span>
          {isApproved && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Approved
            </span>
          )}
        </div>

        <div className="space-y-6">
          {scenes.map((scene) => (
            <div
              key={scene.scene_id}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <div className="mb-3">
                <span className="font-mono text-xs text-muted mb-1 block">
                  Scene {scene.scene_id}
                </span>
                <p className="text-sm font-medium text-ink leading-relaxed bg-white border border-line rounded-md p-2">
                  <span className="text-muted mr-2">Prompt:</span>
                  &ldquo;{scene.simple_description}&rdquo;
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {scene.generated_images?.map((imgSrc, idx) => {
                  const isSelected = scene.selected_image === imgSrc;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectImage(scene.scene_id, imgSrc)}
                      className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? "border-accent ring-2 ring-accent/30 shadow-md scale-[1.02]" 
                          : "border-transparent hover:border-line hover:opacity-90"
                      }`}
                    >
                      <img src={imgSrc} alt={`Variation ${idx + 1}`} className="w-full h-auto object-cover aspect-[3/2] block" />
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1 shadow-sm animate-pop-in">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] font-mono">
                        V{idx + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={handleGenerateImages}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface hover:border-muted"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate All
          </button>
          <button
            onClick={onApprove}
            disabled={!allSelected}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:shadow-md hover:bg-[#2a2d30] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Approve selected images
          </button>
        </div>
      </div>
    </section>
  );
}
