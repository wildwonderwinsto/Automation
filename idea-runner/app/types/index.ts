export type Stage = { id: number; label: string; blurb: string };

export const STAGES: Stage[] = [
  { id: 1, label: "Script", blurb: "Topic to first draft" },
  { id: 2, label: "Scenes", blurb: "Break into shots" },
  { id: 3, label: "Images", blurb: "Visuals per scene" },
  { id: 4, label: "Voice-over", blurb: "Read it aloud" },
  { id: 5, label: "Captions", blurb: "Timed subtitles" },
  { id: 6, label: "Assemble", blurb: "Stitch it together" },
];

export type Note = { id: string; text: string; ts: number };

export type Scene = {
  scene_id: number;
  script_text: string;
  simple_description: string;
  note?: string;
  generated_images?: string[];
  selected_image?: string;
};

export type CaptionStyle = {
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  position: "top" | "center" | "bottom";
  transition: "none" | "fade" | "pop" | "slide-up" | "typewriter" | "bounce";
  wordsPerCaption: number | "max";
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: "Arial",
  fontSize: "medium",
  position: "bottom",
  transition: "fade",
  wordsPerCaption: "max",
};

export type SceneTiming = {
  sceneIndex: number;
  start: number;
  end: number;
};
