import type { RefObject } from "react";

import { MOCK_EVENT_CONFIG } from "@/event/eventConfig";

type ViewfinderProps = {
  videoRef: RefObject<HTMLVideoElement>;
  isReady: boolean;
};

export function Viewfinder({ videoRef, isReady }: ViewfinderProps) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-stone-700 bg-black shadow-camera">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        aria-label="Live camera preview"
      />
      {!isReady ? (
        <div className="absolute inset-0 grid place-items-center bg-black text-sm text-muted-foreground">Starting camera...</div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 viewfinder-grid opacity-35" />
      <div className="pointer-events-none absolute inset-3 border border-white/30" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-sm bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase text-primary">
        {MOCK_EVENT_CONFIG.filterName}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] text-stone-100">
        F2.8 1/125
      </div>
    </div>
  );
}
