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
};
