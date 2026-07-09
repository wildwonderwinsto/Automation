import { Lock, CheckCircle2 } from "lucide-react";
import { STAGES } from "../../types";

type Props = {
  currentStageId: number;
  completedStageIds: number[];
};

export function StageNavigation({ currentStageId, completedStageIds }: Props) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {STAGES.map((stage) => {
        const isActive = stage.id === currentStageId;
        const isDone = completedStageIds.includes(stage.id);
        const isLocked = stage.id > currentStageId && !isDone;

        return (
          <div
            key={stage.id}
            className={`stage-pill min-w-[150px] shrink-0 rounded-lg border px-3 py-2.5 lg:min-w-0 lg:shrink ${
              isActive
                ? "border-accent/30 bg-accent-soft"
                : isDone
                ? "border-line bg-surfaceRaised"
                : "border-line bg-surfaceRaised opacity-60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                {String(stage.id).padStart(2, "0")}
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-ink" : "text-muted"
                }`}
              >
                {stage.label}
              </span>
              {isDone && !isActive && (
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              )}
              {isDone && isActive && (
                <CheckCircle2 className="h-3.5 w-3.5 text-accent animate-check-pulse" />
              )}
              {isLocked && <Lock className="h-3 w-3 text-muted" />}
            </div>
            <p className="mt-0.5 text-xs text-muted">{stage.blurb}</p>
          </div>
        );
      })}
    </nav>
  );
}
