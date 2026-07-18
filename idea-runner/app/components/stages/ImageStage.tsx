import { useState, useEffect, useRef, useCallback } from "react";
import { Scene } from "../../types";
import { Check, CheckCircle2, Wand2, Loader2, Image as ImageIcon, RefreshCw, AlertCircle } from "lucide-react";

type Props = {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  isApproved: boolean;
  onApprove: () => void;
};

const MS_PAINT_STYLE = "flat 2D MS Paint style illustration, drawn with a mouse, thick shaky wobbly black outlines, solid flat colors, naive uneven proportions, no shading, no gradients, no anti-aliasing, plain white background, crude childlike linework, rendered sharp, crisp, and clean at high resolution, not blurry, not soft, not pixelated, not low quality";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 3000;

function ImageWithLoading({ src, alt, isSelected, loadDelay = 0 }: { src: string, alt: string, isSelected: boolean, loadDelay?: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stagger the initial load with a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSrc(src);
    }, loadDelay);
    return () => clearTimeout(timer);
  }, [src, loadDelay]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleError = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setFailed(true);
      setIsLoading(false);
      return;
    }
    
    const delay = BASE_DELAY_MS * Math.pow(1.5, retryCount);
    setRetryCount(prev => prev + 1);
    
    retryTimerRef.current = setTimeout(() => {
      // Add a cache-bust param to force a fresh request
      const bustParam = `&_cb=${Date.now()}`;
      const newSrc = src.includes('_cb=') ? src.replace(/&_cb=\d+/, bustParam) : src + bustParam;
      setCurrentSrc(newSrc);
    }, delay);
  }, [retryCount, src]);

  const handleManualRetry = () => {
    setFailed(false);
    setIsLoading(true);
    setRetryCount(0);
    const bustParam = `&_cb=${Date.now()}`;
    const newSrc = src.includes('_cb=') ? src.replace(/&_cb=\d+/, bustParam) : src + bustParam;
    setCurrentSrc(newSrc);
  };

  const statusText = !currentSrc
    ? "Queued..."
    : retryCount > 0
    ? `Drawing... (attempt ${retryCount + 1})`
    : "Drawing...";

  return (
    <div className="relative w-full aspect-[16/9] bg-surface flex items-center justify-center overflow-hidden">
       {failed ? (
         <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surfaceRaised">
           <AlertCircle className="h-5 w-5 text-red-400" />
           <span className="text-[10px] text-muted font-mono">Failed to load</span>
           <button
             onClick={(e) => { e.stopPropagation(); handleManualRetry(); }}
             className="mt-1 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[10px] font-mono text-ink hover:bg-surface transition-colors"
           >
             <RefreshCw className="h-3 w-3" />
             Retry
           </button>
         </div>
       ) : isLoading && (
         <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surfaceRaised/50">
           <Loader2 className="h-5 w-5 animate-spin text-accent" />
           <span className="text-[10px] text-muted font-mono animate-pulse">{statusText}</span>
         </div>
       )}
       {currentSrc && (
         <img 
           src={currentSrc} 
           alt={alt} 
           onLoad={() => { setIsLoading(false); setFailed(false); }}
           onError={handleError}
           className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading || failed ? 'opacity-0' : 'opacity-100'}`} 
         />
       )}
       {isSelected && !failed && (
         <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1 shadow-sm animate-pop-in">
           <CheckCircle2 className="w-4 h-4" />
         </div>
       )}
       {!failed && (
         <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] font-mono">
           {alt}
         </div>
       )}
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
      
      // Generate at native 4K so the Assemble stage's 4K option never upscales a
      // softer source — 4K downscales cleanly to 1080p, but 1080p upscaled to 4K blurs.
      const url1 = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=3840&height=2160&model=flux&nologo=true&seed=${seed1}`;
      const url2 = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=3840&height=2160&model=flux&nologo=true&seed=${seed2}`;

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
          {scenes.map((scene, sceneIdx) => (
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
                  // Stagger loads: 5s apart per image across all scenes
                  const globalIdx = sceneIdx * 2 + idx;
                  const delay = globalIdx * 5000;
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
                        loadDelay={delay}
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
