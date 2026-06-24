import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Eye,
  EyeOff,
  ImageOff,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";

import {
  AdminEvent,
  AdminPhoto,
  CreateEventInput,
  RetroSnapAdminAPI,
} from "./api";

const tokenStorageKey = "retrosnap.admin-token.v1";

type CreateEventForm = {
  eventId: string;
  eventName: string;
  maxFrames: number;
  revealAt: string;
  filterName: string;
  isActive: boolean;
};

const defaultForm: CreateEventForm = {
  eventId: "",
  eventName: "Demo Wedding",
  maxFrames: 27,
  revealAt: toDateTimeLocal(defaultRevealDate()),
  filterName: "Malaysian Vintage",
  isActive: true,
};

export function App() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? "");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [form, setForm] = useState<CreateEventForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => new RetroSnapAdminAPI(() => adminToken), [adminToken]);

  useEffect(() => {
    localStorage.setItem(tokenStorageKey, adminToken);
  }, [adminToken]);

  useEffect(() => {
    void loadEvents();
  }, [api]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].eventId);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (selectedEventId) {
      void loadSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  async function loadEvents() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.listEvents();
      setEvents(result.events);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSelectedEvent(eventId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const [event, photoResult] = await Promise.all([api.getEvent(eventId), api.listPhotos(eventId)]);
      setSelectedEvent(event);
      setPhotos(photoResult.photos);
      setEvents((current) => current.map((item) => (item.eventId === event.eventId ? event : item)));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const input: CreateEventInput = {
        eventId: form.eventId.trim() || undefined,
        eventName: form.eventName,
        maxFrames: form.maxFrames,
        revealAt: new Date(form.revealAt).toISOString(),
        filterName: form.filterName,
        isActive: form.isActive,
      };
      const created = await api.createEvent(input);
      setEvents((current) => [created, ...current]);
      setSelectedEventId(created.eventId);
      setForm(defaultForm);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleHidden(photo: AdminPhoto) {
    setBusyPhotoId(photo.photoId);
    setError(null);
    try {
      const updated = await api.setPhotoHidden(photo.photoId, photo.uploadStatus !== "hidden");
      setPhotos((current) => current.map((item) => (item.photoId === updated.photoId ? updated : item)));
      if (selectedEventId) {
        const event = await api.getEvent(selectedEventId);
        setSelectedEvent(event);
        setEvents((current) => current.map((item) => (item.eventId === event.eventId ? event : item)));
      }
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RetroSnap</p>
          <h1>Admin Lite</h1>
        </div>
        <label className="token-box">
          <Shield size={16} aria-hidden="true" />
          <span>Admin token</span>
          <input
            type="password"
            value={adminToken}
            placeholder="Optional in dev"
            onChange={(event) => setAdminToken(event.target.value)}
          />
        </label>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="layout">
        <aside className="sidebar">
          <section className="panel">
            <div className="panel-header">
              <h2>Create demo event</h2>
              <CalendarPlus size={18} aria-hidden="true" />
            </div>
            <form className="form-grid" onSubmit={createEvent}>
              <label>
                Event name
                <input
                  value={form.eventName}
                  onChange={(event) => setForm({ ...form, eventName: event.target.value })}
                />
              </label>
              <label>
                Event ID
                <input
                  value={form.eventId}
                  placeholder="Auto-generated"
                  onChange={(event) => setForm({ ...form, eventId: event.target.value })}
                />
              </label>
              <div className="form-row">
                <label>
                  Max frames
                  <input
                    type="number"
                    min={1}
                    value={form.maxFrames}
                    onChange={(event) => setForm({ ...form, maxFrames: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Active
                  <select
                    value={form.isActive ? "yes" : "no"}
                    onChange={(event) => setForm({ ...form, isActive: event.target.value === "yes" })}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
              </div>
              <label>
                Reveal at
                <input
                  type="datetime-local"
                  value={form.revealAt}
                  onChange={(event) => setForm({ ...form, revealAt: event.target.value })}
                />
              </label>
              <label>
                Filter
                <input
                  value={form.filterName}
                  onChange={(event) => setForm({ ...form, filterName: event.target.value })}
                />
              </label>
              <button className="button primary" disabled={isCreating}>
                {isCreating ? <Loader2 className="spin" size={16} /> : <CalendarPlus size={16} />}
                Create event
              </button>
            </form>
          </section>

          <section className="panel event-list-panel">
            <div className="panel-header">
              <h2>Events</h2>
              <button className="icon-button" onClick={loadEvents} aria-label="Refresh events">
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="event-list">
              {events.map((event) => (
                <button
                  key={event.eventId}
                  className={`event-row ${selectedEventId === event.eventId ? "selected" : ""}`}
                  onClick={() => setSelectedEventId(event.eventId)}
                >
                  <span>
                    <strong>{event.eventName}</strong>
                    <small>{event.eventId}</small>
                  </span>
                  <span className="mini-count">{event.stats.processed}/{event.stats.total}</span>
                </button>
              ))}
              {!events.length && !isLoading ? <p className="muted">No events yet.</p> : null}
            </div>
          </section>
        </aside>

        <section className="workspace">
          <div className="workspace-header">
            <div>
              <p className="eyebrow">Moderation</p>
              <h2>{selectedEvent?.eventName ?? "Select an event"}</h2>
              {selectedEvent ? <p className="muted">{selectedEvent.eventId}</p> : null}
            </div>
            <button
              className="button secondary"
              disabled={!selectedEventId || isLoading}
              onClick={() => selectedEventId && loadSelectedEvent(selectedEventId)}
            >
              {isLoading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
              Refresh
            </button>
          </div>

          {selectedEvent ? (
            <>
              <StatsGrid event={selectedEvent} />
              <div className="photo-grid">
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.photoId}
                    photo={photo}
                    busy={busyPhotoId === photo.photoId}
                    onToggleHidden={() => toggleHidden(photo)}
                  />
                ))}
              </div>
              {!photos.length ? (
                <div className="empty-state">
                  <ImageOff size={32} aria-hidden="true" />
                  <p>No uploaded photos for this event yet.</p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <CheckCircle2 size={32} aria-hidden="true" />
              <p>Create or select an event to review uploads before reveal.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatsGrid({ event }: { event: AdminEvent }) {
  const stats = [
    ["Total", event.stats.total],
    ["Uploaded", event.stats.uploaded],
    ["Processing", event.stats.processing],
    ["Processed", event.stats.processed],
    ["Failed", event.stats.failed],
    ["Hidden", event.stats.hidden],
  ];

  return (
    <div className="stats-grid">
      {stats.map(([label, value]) => (
        <div key={label} className="stat-card">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function PhotoCard({ photo, busy, onToggleHidden }: { photo: AdminPhoto; busy: boolean; onToggleHidden: () => void }) {
  const isHidden = photo.uploadStatus === "hidden";

  return (
    <article className={`photo-card ${isHidden ? "hidden-photo" : ""}`}>
      <div className="photo-preview">
        {photo.previewUrl ? <img src={photo.previewUrl} alt="" /> : <ImageOff size={28} aria-hidden="true" />}
      </div>
      <div className="photo-body">
        <div className="photo-title">
          <span className={`status ${photo.uploadStatus}`}>{photo.uploadStatus}</span>
          <small>{photo.localPhotoId.slice(0, 12)}</small>
        </div>
        <dl>
          <div>
            <dt>Captured</dt>
            <dd>{formatDate(photo.capturedAt)}</dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>{formatBytes(photo.sizeBytes)}</dd>
          </div>
          <div>
            <dt>Processed</dt>
            <dd>{photo.processedAt ? formatDate(photo.processedAt) : "Pending"}</dd>
          </div>
        </dl>
        {photo.errorMessage ? <p className="photo-error">{photo.errorMessage}</p> : null}
        <button className={`button ${isHidden ? "secondary" : "danger"}`} onClick={onToggleHidden} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          {isHidden ? "Unhide" : "Hide"}
        </button>
      </div>
    </article>
  );
}

function defaultRevealDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(0, 0, 0);
  return date;
}

function toDateTimeLocal(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
