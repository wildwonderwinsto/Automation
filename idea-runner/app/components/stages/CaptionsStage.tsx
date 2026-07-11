import { useState, useEffect } from "react";
import { Scene, SceneTiming, CaptionStyle, DEFAULT_CAPTION_STYLE } from "../../types";
import {
  Check,
  CheckCircle2,
  Wand2,
  Loader2,
  Type,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Sparkles,
  Hash,
} from "lucide-react";

type SrtBlock = {
  index: number;
  start: string;
  end: string;
  text: string;
};

type Props = {
  scenes: Scene[];
  audioUrl: string | null;
  srtBlocks: SrtBlock[];
  onSrtGenerated: (blocks: SrtBlock[]) => void;
  onSceneTimingsGenerated: (timings: SceneTiming[]) => void;
  captionStyle: CaptionStyle;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  isApproved: boolean;
  onApprove: () => void;
};

const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Impact", label: "Impact" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier New" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Trebuchet MS", label: "Trebuchet" },
  { value: "Verdana", label: "Verdana" },
];

const SIZE_OPTIONS: { value: CaptionStyle["fontSize"]; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const POSITION_OPTIONS: {
  value: CaptionStyle["position"];
  label: string;
  Icon: typeof AlignVerticalJustifyStart;
}[] = [
  { value: "top", label: "Top", Icon: AlignVerticalJustifyStart },
  { value: "center", label: "Center", Icon: AlignVerticalJustifyCenter },
  { value: "bottom", label: "Bottom", Icon: AlignVerticalJustifyEnd },
];

const TRANSITION_OPTIONS: {
  value: CaptionStyle["transition"];
  label: string;
  desc: string;
}[] = [
  { value: "none", label: "None", desc: "Instant cut" },
  { value: "fade", label: "Fade", desc: "Smooth opacity" },
  { value: "pop", label: "Pop", desc: "Scale bounce" },
  { value: "slide-up", label: "Slide Up", desc: "Rise from below" },
  { value: "typewriter", label: "Typewriter", desc: "Word by word" },
  { value: "bounce", label: "Bounce", desc: "Drop & bounce" },
];

const WPC_OPTIONS: { value: number | "max"; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: "max", label: "Max" },
];

/**
 * Generates a CSS text-shadow that closely mimics an ASS Outline effect.
 * Uses cqw units so the outline scales proportionally with the font size.
 */
function assOutlineShadowCqw(outlineCqw: number, shadowCqw: number): string {
  // 8-direction solid outline
  const directions = [
    [outlineCqw, 0], [-outlineCqw, 0], [0, outlineCqw], [0, -outlineCqw],
    [outlineCqw, outlineCqw], [-outlineCqw, -outlineCqw], [outlineCqw, -outlineCqw], [-outlineCqw, outlineCqw],
  ];
  const outlineShadows = directions.map(
    ([x, y]) => `${x}cqw ${y}cqw 0 rgba(0,0,0,0.95)`
  );

  // Drop shadow
  const dropShadow = `${shadowCqw}cqw ${shadowCqw}cqw ${shadowCqw * 2}cqw rgba(0,0,0,0.5)`;

  return [...outlineShadows, dropShadow].join(', ');
}

export function CaptionsStage({
  scenes,
  audioUrl,
  srtBlocks,
  onSrtGenerated,
  onSceneTimingsGenerated,
  captionStyle,
  onCaptionStyleChange,
  isApproved,
  onApprove,
}: Props) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">(
    srtBlocks.length > 0 ? "ready" : "idle"
  );
  const [previewText, setPreviewText] = useState("This is what your captions look like.");
  const [previewAnimKey, setPreviewAnimKey] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    if (status === "idle" && scenes.length > 0) {
      handleGenerateSrt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle through captions in the preview
  useEffect(() => {
    if (srtBlocks.length === 0) return;
    let i = 0;
    setPreviewText(srtBlocks[0].text);
    const interval = setInterval(() => {
      i = (i + 1) % srtBlocks.length;
      setPreviewText(srtBlocks[i].text);
      setPreviewAnimKey((k) => k + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [srtBlocks]);

  // Re-trigger animation on style change
  function triggerPreviewAnim() {
    setPreviewAnimKey((k) => k + 1);
  }

  // Typewriter effect: reveal words one at a time (matches CapCut's \kf karaoke)
  useEffect(() => {
    if (captionStyle.transition !== "typewriter") {
      setTypewriterText(previewText);
      setTypewriterDone(true);
      return;
    }
    setTypewriterDone(false);
    setTypewriterText("");
    const words = previewText.split(/\s+/);
    let wordIdx = 0;
    const interval = setInterval(() => {
      wordIdx++;
      if (wordIdx >= words.length) {
        setTypewriterText(previewText);
        setTypewriterDone(true);
        clearInterval(interval);
      } else {
        setTypewriterText(words.slice(0, wordIdx).join(' '));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [previewText, previewAnimKey, captionStyle.transition]);

  async function handleGenerateSrt(wpcOverride?: number | "max") {
    if (status === "generating") return;
    setStatus("generating");

    const wpc = wpcOverride ?? captionStyle.wordsPerCaption ?? "max";

    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, audioUrl, wordsPerCaption: wpc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate captions");

      onSrtGenerated(data.srtBlocks);
      if (data.sceneTimings) {
        onSceneTimingsGenerated(data.sceneTimings);
      }
      setStatus("ready");
    } catch (err: any) {
      console.error(err);
      setStatus("idle");
      alert(err.message);
    }
  }

  function updateStyle(patch: Partial<CaptionStyle>) {
    onCaptionStyleChange({ ...captionStyle, ...patch });
    triggerPreviewAnim();
  }

  function handleWordsPerCaptionChange(val: number | "max") {
    onCaptionStyleChange({ ...captionStyle, wordsPerCaption: val });
    // Re-generate captions with new word count
    handleGenerateSrt(val);
  }

  /* ── Preview font size mapping ──
   * ASS (libass) and CSS define "font size" differently. CSS uses the EM square,
   * while ASS uses the absolute bounding box (Ascender + Descender).
   * For standard fonts like Arial, this means CSS renders the font ~10-15% larger
   * than libass for the exact same pixel value. We apply a 0.895x compensation scale
   * (derived from 2048 EM units / 2288 Ascender+Descender).
   *
   * These values match ASS FontSize at PlayRes 1920x1080:
   * small: 48, medium: 72, large: 96
   */
  const fontSizeValues = { small: 48, medium: 72, large: 96 };
  const currentFontSize = fontSizeValues[captionStyle.fontSize] || 72;
  const ASS_TO_CSS_SCALE = 0.895;
  const currentFontSizeCqw = (currentFontSize / 1920) * 100 * ASS_TO_CSS_SCALE;
  const previewFontSize = `${currentFontSizeCqw}cqw`;

  /* ── Outline/Shadow matching ASS values ──
   * Outline = 5.5% of font size, Shadow = 2.5% of font size
   * Convert from PlayRes units to cqw for the preview.
   */
  const textShadowStyle = assOutlineShadowCqw(
    currentFontSizeCqw * 0.055 * 0.7, // Scaled slightly to match CSS multi-shadow thickness
    currentFontSizeCqw * 0.025 * 0.7
  );

  /* ── Preview position mapping ──
   * Matches ASS Alignment values and MarginV.
   * MarginV = 38px at 1080p PlayRes = 38/1080 = ~3.5% of height.
   * For 16:9 container, that's 3.5% of (width / 16 * 9) = 3.5cqh equivalent.
   */
  const previewPositionClass =
    captionStyle.position === "top"
      ? "items-start"
      : captionStyle.position === "center"
      ? "items-center"
      : "items-end";
  
  const previewPaddingStyle = 
    captionStyle.position === "top"
      ? { paddingTop: "3.5%", paddingBottom: "0" }
      : captionStyle.position === "center"
      ? { paddingTop: "0", paddingBottom: "0" }
      : { paddingTop: "0", paddingBottom: "3.5%" };

  /* ── Preview animation ──
   * These CSS animations mimic the ASS override tags used in
   * assemble-video-node.mjs applyTransitionTags().
   */
  const transitionStyle = (() => {
    switch (captionStyle.transition) {
      case "fade":
        return "animate-[captionFadeIn_0.4s_ease_both]";
      case "pop":
        return "animate-[captionPop_0.35s_cubic-bezier(0.22,1,0.36,1)_both]";
      case "slide-up":
        return "animate-[captionSlideUp_0.35s_ease_both]";
      case "typewriter":
        return ""; // handled by JS state (word-by-word reveal)
      case "bounce":
        return "animate-[captionBounce_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]";
      default:
        return "";
    }
  })();

  /* ───────── Loading state ───────── */
  if (status === "generating") {
    return (
      <section className="card-interactive rounded-card border border-line bg-surfaceRaised p-8 sm:p-12 flex flex-col items-center justify-center gap-5 text-sm text-muted min-h-[320px]">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full bg-accent/20 animate-ping"
            style={{ animationDuration: "2s" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
            <Type className="h-7 w-7 text-accent animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-ink font-medium text-base">Generating captions...</p>
          <p className="text-xs text-muted max-w-xs mx-auto">
            Transcribing audio and aligning timestamps to scene boundaries.
          </p>
        </div>
      </section>
    );
  }

  /* ───────── Main UI ───────── */
  return (
    <section className="space-y-4 w-full min-w-0">
      <div className="card-interactive animate-fade-slide-up rounded-card border border-line bg-surfaceRaised p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Caption Style
          </span>
          {isApproved && (
            <span className="animate-pop-in inline-flex items-center gap-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5 animate-check-pulse" />
              Approved
            </span>
          )}
        </div>

        {/* ── Live Preview ──
         * This preview is designed to exactly match the ASS subtitle render.
         * - Font size uses cqw units that correspond to ASS FontSize at PlayRes 1920x1080
         * - Text shadow uses multi-directional solid shadows to mimic ASS Outline
         * - Position padding matches ASS MarginV (3.5% of height = 38/1080)
         * - Max width matches ASS MarginL/MarginR (144px each = ~85% of 1920)
         */}
        <div
          className={`relative rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border border-white/10 overflow-hidden mb-6 flex justify-center ${previewPositionClass}`}
          style={{ containerType: "inline-size", aspectRatio: "16/9", minHeight: "180px", ...previewPaddingStyle }}
        >
          {/* Fake video frame lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)",
          }} />
          {/* Timestamp badge */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 font-mono text-[10px] text-white/60">
            00:00:03,200
          </div>
          {/* Render method badge */}
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 font-mono text-[10px] text-white/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ASS render
          </div>
          {/* Caption text */}
          <div
            key={previewAnimKey}
            className={`px-4 max-w-[85%] ${transitionStyle}`}
          >
            <p
              className="text-center leading-tight"
              style={{
                fontSize: previewFontSize,
                fontFamily: captionStyle.fontFamily,
                color: "white",
                textShadow: textShadowStyle,
                lineHeight: 1,
              }}
            >
              {captionStyle.transition === "typewriter" ? (
                <>
                  {typewriterText}
                  {!typewriterDone && (
                    <span className="animate-[blink_0.7s_step-end_infinite] ml-[1px] opacity-60">|</span>
                  )}
                </>
              ) : (
                previewText
              )}
            </p>
          </div>
        </div>

        {/* ── Config Controls ── */}
        <div className="space-y-5">
          {/* Words Per Caption */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-2 uppercase tracking-wide font-mono">
              <Hash className="h-3.5 w-3.5" />
              Words Per Caption
            </label>
            <div className="grid grid-cols-6 gap-2">
              {WPC_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => handleWordsPerCaptionChange(opt.value)}
                  className={`rounded-lg border-2 px-2 py-2.5 text-sm text-center transition-all ${
                    captionStyle.wordsPerCaption === opt.value
                      ? "border-accent bg-accent/5 text-ink font-medium"
                      : "border-line bg-white text-muted hover:border-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-1.5 pl-0.5">
              {captionStyle.wordsPerCaption === "max"
                ? "Shows all words per scene at once"
                : `Shows ${captionStyle.wordsPerCaption} word${Number(captionStyle.wordsPerCaption) > 1 ? "s" : ""} at a time, synced to the voiceover`}
            </p>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wide font-mono">
              Font
            </label>
            <select
              value={captionStyle.fontFamily}
              onChange={(e) => updateStyle({ fontFamily: e.target.value })}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              style={{ fontFamily: captionStyle.fontFamily }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wide font-mono">
              Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateStyle({ fontSize: s.value })}
                  className={`rounded-lg border-2 px-3 py-2 text-sm text-center transition-all ${
                    captionStyle.fontSize === s.value
                      ? "border-accent bg-accent/5 text-ink font-medium"
                      : "border-line bg-white text-muted hover:border-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wide font-mono">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {POSITION_OPTIONS.map((p) => {
                const Icon = p.Icon;
                return (
                  <button
                    key={p.value}
                    onClick={() => updateStyle({ position: p.value })}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm flex items-center justify-center gap-2 transition-all ${
                      captionStyle.position === p.value
                        ? "border-accent bg-accent/5 text-ink font-medium"
                        : "border-line bg-white text-muted hover:border-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transition */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wide font-mono">
              Transition
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRANSITION_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateStyle({ transition: t.value })}
                  className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                    captionStyle.transition === t.value
                      ? "border-accent bg-accent/5"
                      : "border-line bg-white hover:border-muted"
                  }`}
                >
                  <p className={`text-sm ${captionStyle.transition === t.value ? "text-ink font-medium" : "text-ink"}`}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Captions List (collapsible) ── */}
        {srtBlocks.length > 0 && (
          <details className="mt-6 rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-xs font-mono text-muted hover:text-ink select-none flex items-center justify-between">
              <span>{srtBlocks.length} captions generated</span>
              <Sparkles className="h-3.5 w-3.5" />
            </summary>
            <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
              {srtBlocks.map((block) => (
                <div
                  key={block.index}
                  className="rounded-md bg-white border border-line px-3 py-2 flex items-baseline gap-3"
                >
                  <span className="font-mono text-[10px] text-muted shrink-0 tabular-nums">
                    {block.start.split(",")[0]}
                  </span>
                  <p className="text-sm text-ink leading-snug">{block.text}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ── Actions ── */}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={() => handleGenerateSrt()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-ink hover:border-muted hover:bg-surface transition-all active:scale-[0.99]"
          >
            <Wand2 className="h-4 w-4" />
            Regenerate
          </button>
          <button
            onClick={onApprove}
            disabled={srtBlocks.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-black hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
          >
            <Check className="h-4 w-4" />
            Approve Captions
          </button>
        </div>
      </div>

      {/* ── Inline keyframes for caption animations ── */}
      <style jsx global>{`
        @keyframes captionFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes captionPop {
          0% { opacity: 0; transform: scale(0.6); }
          60% { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes captionSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes captionBounce {
          0% { opacity: 0; transform: translateY(-20px) scale(0.9); }
          50% { opacity: 1; transform: translateY(6px) scale(1.02); }
          70% { transform: translateY(-3px) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
