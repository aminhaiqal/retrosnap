import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ShutterButtonProps = {
  disabled?: boolean;
  isCapturing?: boolean;
  onPress: () => void;
};

export function ShutterButton({ disabled, isCapturing, onPress }: ShutterButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      disabled={disabled}
      onClick={onPress}
      aria-label="Take photo"
      className={cn(
        "h-20 w-20 rounded-full border-4 border-stone-100 bg-accent text-accent-foreground shadow-camera hover:bg-accent/90",
        "after:absolute after:h-12 after:w-12 after:rounded-full after:border after:border-white/35",
        isCapturing && "scale-95",
      )}
    >
      <Camera className="h-8 w-8" aria-hidden="true" />
    </Button>
  );
}
