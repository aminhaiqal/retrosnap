import { useEffect } from "react";

type FilmWindAnimationProps = {
  active: boolean;
  onFinished: () => void;
};

export function FilmWindAnimation({ active, onFinished }: FilmWindAnimationProps) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = window.setTimeout(onFinished, 820);
    return () => window.clearTimeout(timer);
  }, [active, onFinished]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-lg">
      <div className="absolute inset-0 animate-shutter-flash bg-white" />
      <div className="absolute left-1/2 top-1/2 h-20 w-[135%] -translate-x-1/2 -translate-y-1/2 animate-film-wind border-y border-primary/45 bg-black/70 shadow-camera">
        <div className="flex h-full items-center justify-around">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={index} className="h-9 w-5 rounded-sm bg-primary/25" />
          ))}
        </div>
      </div>
    </div>
  );
}
