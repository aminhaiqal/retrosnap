import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type FrameCounterProps = {
  framesRemaining: number;
  maxFrames: number;
};

export function FrameCounter({ framesRemaining, maxFrames }: FrameCounterProps) {
  const usedFrames = maxFrames - framesRemaining;
  const progress = Math.min(100, Math.max(0, (usedFrames / maxFrames) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Film roll</span>
        <Badge variant={framesRemaining > 0 ? "outline" : "secondary"}>
          {framesRemaining > 0 ? `${framesRemaining} frames remaining` : "Film roll completed"}
        </Badge>
      </div>
      <Progress value={progress} aria-label={`${framesRemaining} frames remaining`} />
    </div>
  );
}
