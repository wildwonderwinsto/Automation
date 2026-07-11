import { useState, useEffect } from "react";
import { Scene } from "../../types";
import { Check, CheckCircle2, Wand2, Loader2, Image as ImageIcon } from "lucide-react";

type Props = {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  isApproved: boolean;
  onApprove: () => void;
};

const MS_PAINT_STYLE = "MS Paint style, drawn with a mouse, shaky wobbly outlines, flat colors, uneven proportions, no shading, no gradients, white background, low-resolution, deliberately crude";

function ImageWithLoading({ src, alt, isSelected }: { src: string, alt: string, isSelected: boolean }) {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className="relative w-full aspect-[16/9] bg-surface flex items-center justify-center overflow-hidden">
       {isLoading && (
         <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surfaceRaised/50">
           <Loader2 className="h-5 w-5 animate-spin text-accent" />
           <span className="text-[10px] text-muted font-mono animate-pulse">Drawing...</span>
         </div>
       )}
       <img 
         src={src} 
         alt={alt} 
         onLoad={() => setIsLoading(false)}
         className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
       />
       {isSelected && (
         <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1 shadow-sm animate-pop-in">
           <CheckCircle2 className="w-4 h-4" />
         </div>
       )}
       <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] font-mono">
         {alt}
       </div>
    </div>
  );
}

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

    const updatedScenes = scenes.map((scene) => {
      // Prompt engineering: Append the MS Paint style modifiers
      const fullPrompt = `${scene.simple_description}, ${MS_PAINT_STYLE}`;
      const encodedPrompt = encodeURIComponent(fullPrompt);
      
      // Use random seeds so we get variations, but the URL remains deterministic for assembly caching
      const seed1 = Math.floor(Math.random() * 1000000);
      const seed2 = Math.floor(Math.random() * 1000000);
      
      const url1 = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${seed1}`;
      const url2 = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${seed2}`;

      return {
        ...scene,
        generated_images: [url1, url2],
        selected_image: undefined, // Reset selection if regenerating
      };
    });

    onScenesChange(updatedScenes);
    setStatus("ready");
  }

  function handleSelectImage(sceneId: number, imageSrc: string) {
    onScenesChange(
      scenes.map((s) =>
        s.scene_id === sceneId ? { ...s, selected_image: imageSrc } : s
      )
    );
  }

  function handleApproveSubmit() {
    const updatedScenes = scenes.map((s) => {
      if (!s.selected_image && s.generated_images && s.generated_images.length > 0) {
        return { ...s, selected_image: s.generated_images[0] };
      }
      return s;
    });
    
    onScenesChange(updatedScenes);
    onApprove();
  }

  const allSelected = scenes.every((s) => !!s.selected_image);

  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-6 flex h-64 flex-col items-center justify-center gap-4 text-sm text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="animate-pulse">Setting up image generation pipeline...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 w-full min-w-0">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
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
                <p className="text-sm font-medium text-ink leading-relaxed bg-white border border-line rounded-md p-3">
                  <span className="text-muted mr-2 font-mono text-[10px] uppercase">Prompt:</span>
                  &ldquo;{scene.simple_description}&rdquo;
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scene.generated_images?.map((imgSrc, idx) => {
                  const isSelected = scene.selected_image === imgSrc;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectImage(scene.scene_id, imgSrc)}
                      className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? "border-accent ring-2 ring-accent/30 shadow-md scale-[1.02] z-10" 
                          : "border-transparent hover:border-line hover:opacity-90"
                      }`}
                    >
                      <ImageWithLoading 
                        src={imgSrc} 
                        alt={`V${idx + 1}`} 
                        isSelected={isSelected} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleGenerateImages}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-ink hover:border-muted hover:bg-surface transition-all active:scale-[0.99]"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate All
          </button>
          <button
            onClick={handleApproveSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-black hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
          >
            <Check className="h-4 w-4" />
            Approve Images
          </button>
        </div>
      </div>
    </section>
  );
}
