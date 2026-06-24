import { Camera } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function EmptyQueueState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
      <Camera className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold">No local photos yet</h2>
        <p className="text-sm text-muted-foreground">Captured photos will appear here after they are saved to IndexedDB.</p>
      </div>
      <Button asChild>
        <Link to="/">Open camera</Link>
      </Button>
    </div>
  );
}
