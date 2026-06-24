import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, Lock, X } from "lucide-react";

import { API_BASE_URL } from "@/lib/config";

type AlbumPhoto = {
  photoId: string;
  thumbnailUrl: string;
  processedUrl: string;
  capturedAt: string;
};

type AlbumResponse = {
  eventId: string;
  eventName: string;
  revealAt: string;
  isLocked: boolean;
  photos: AlbumPhoto[];
};

export function AlbumPage() {
  const { eventId } = useParams();
  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAlbum() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/events/${encodeURIComponent(eventId ?? "")}/album`);
        if (!response.ok) {
          throw new Error("Could not load album.");
        }
        const data = (await response.json()) as AlbumResponse;
        if (mounted) {
          setAlbum(data);
          setError(null);
        }
      } catch (nextError) {
        if (mounted) {
          setError(nextError instanceof Error ? nextError.message : "Could not load album.");
        }
      }
    }

    void loadAlbum();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  if (error) {
    return <AlbumShell title="Album unavailable" subtitle={error} />;
  }

  if (!album) {
    return <AlbumShell title="Loading album" subtitle="The photos are almost ready." />;
  }

  if (album.isLocked) {
    return (
      <AlbumShell
        title={album.eventName}
        subtitle={`Photos are developing. Reveal opens ${formatDate(album.revealAt)}.`}
        locked
      />
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">RetroSnap album</p>
            <h1 className="text-3xl font-bold">{album.eventName}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{album.photos.length} photos revealed</p>
        </header>

        {album.photos.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {album.photos.map((photo) => (
              <button
                key={photo.photoId}
                className="aspect-[3/2] overflow-hidden rounded-lg border border-border bg-card"
                onClick={() => setActivePhoto(photo)}
              >
                <img src={photo.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[300px] place-items-center rounded-lg border border-border bg-card text-center">
            <div>
              <Camera className="mx-auto mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
              <p className="text-muted-foreground">No processed photos are visible yet.</p>
            </div>
          </div>
        )}
      </div>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={() => setActivePhoto(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-3" aria-label="Close photo">
            <X className="h-5 w-5" />
          </button>
          <img src={activePhoto.processedUrl} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      ) : null}
    </main>
  );
}

function AlbumShell({ title, subtitle, locked }: { title: string; subtitle: string; locked?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center text-foreground">
      <div className="max-w-sm rounded-lg border border-border bg-card p-6">
        {locked ? <Lock className="mx-auto mb-4 h-9 w-9 text-primary" aria-hidden="true" /> : null}
        <p className="text-xs font-semibold uppercase text-primary">RetroSnap album</p>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
