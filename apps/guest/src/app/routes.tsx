import { Route, Routes } from "react-router-dom";
import { CameraOff } from "lucide-react";

import { LocalQueuePage } from "@/album/LocalQueuePage";
import { AlbumPage } from "@/album/AlbumPage";
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
          Open this link in a modern mobile browser with camera access enabled. Photos are saved first, then posted automatically.
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
      <Route path="/e/:eventId" element={<CameraPage />} />
      <Route path="/e/:eventId/album" element={<AlbumPage />} />
      <Route path="/queue" element={<LocalQueuePage />} />
      <Route path="/unsupported" element={<UnsupportedBrowserPage />} />
      <Route path="*" element={<UnsupportedBrowserPage />} />
    </Routes>
  );
}
