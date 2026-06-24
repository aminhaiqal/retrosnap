import { Route, Routes } from "react-router-dom";
import { CameraOff } from "lucide-react";

import { LocalQueuePage } from "@/album/LocalQueuePage";
import { CameraPage } from "@/camera/CameraPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function UnsupportedBrowserPage() {
  return (
    <main className="phone-shell mx-auto grid w-full max-w-[430px] place-items-center px-4">
      <Alert>
        <CameraOff className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>RetroSnap needs a camera browser</AlertTitle>
        <AlertDescription>
          Open this link in a modern mobile browser with camera access enabled. Photos are saved locally before upload.
        </AlertDescription>
        <Button type="button" className="mt-4" onClick={() => history.back()}>
          Go back
        </Button>
      </Alert>
    </main>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CameraPage />} />
      <Route path="/queue" element={<LocalQueuePage />} />
      <Route path="/unsupported" element={<UnsupportedBrowserPage />} />
      <Route path="*" element={<UnsupportedBrowserPage />} />
    </Routes>
  );
}
