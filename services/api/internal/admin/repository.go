package admin

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type EventWithStats struct {
	EventID    string
	EventName  string
	MaxFrames  int
	RevealAt   time.Time
	FilterName string
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Stats      EventStats
}

type EventStats struct {
	Total      int
	Uploaded   int
	Processing int
	Processed  int
	Failed     int
	Hidden     int
}

type CreateEventParams struct {
	EventID    string
	EventName  string
	MaxFrames  int
	RevealAt   time.Time
	FilterName string
	IsActive   bool
}

func (r *Repository) ListEvents(ctx context.Context) ([]EventWithStats, error) {
	const query = `
SELECT e.id,
       e.event_name,
       e.max_frames,
       e.reveal_at,
       e.filter_name,
       e.is_active,
       e.created_at,
       e.updated_at,
       COUNT(p.id)::int AS total,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'uploaded')::int AS uploaded,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'processing')::int AS processing,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'processed')::int AS processed,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'failed')::int AS failed,
       COUNT(p.id) FILTER (WHERE p.is_hidden = true)::int AS hidden
FROM events e
LEFT JOIN photos p ON p.event_id = e.id
GROUP BY e.id
ORDER BY e.created_at DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []EventWithStats{}
	for rows.Next() {
		event, err := scanEventWithStats(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, *event)
	}

	return events, rows.Err()
}

func (r *Repository) GetEvent(ctx context.Context, eventID string) (*EventWithStats, error) {
	const query = `
SELECT e.id,
       e.event_name,
       e.max_frames,
       e.reveal_at,
       e.filter_name,
       e.is_active,
       e.created_at,
       e.updated_at,
       COUNT(p.id)::int AS total,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'uploaded')::int AS uploaded,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'processing')::int AS processing,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'processed')::int AS processed,
       COUNT(p.id) FILTER (WHERE p.upload_status = 'failed')::int AS failed,
       COUNT(p.id) FILTER (WHERE p.is_hidden = true)::int AS hidden
FROM events e
LEFT JOIN photos p ON p.event_id = e.id
WHERE e.id = $1
GROUP BY e.id`

	event, err := scanEventWithStats(r.db.QueryRow(ctx, query, eventID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return event, nil
}

func (r *Repository) CreateEvent(ctx context.Context, params CreateEventParams) (*EventWithStats, error) {
	const query = `
INSERT INTO events (id, event_name, max_frames, reveal_at, filter_name, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, event_name, max_frames, reveal_at, filter_name, is_active, created_at, updated_at`

	var event EventWithStats
	err := r.db.QueryRow(ctx, query,
		params.EventID,
		params.EventName,
		params.MaxFrames,
		params.RevealAt,
		params.FilterName,
		params.IsActive,
	).Scan(
		&event.EventID,
		&event.EventName,
		&event.MaxFrames,
		&event.RevealAt,
		&event.FilterName,
		&event.IsActive,
		&event.CreatedAt,
		&event.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &event, nil
}

type AdminPhoto struct {
	PhotoID            uuid.UUID
	EventID            string
	GuestSessionID     uuid.UUID
	GuestDisplayName   string
	LocalPhotoID       string
	ObjectKey          string
	ProcessedObjectKey *string
	ThumbnailObjectKey *string
	UploadStatus       string
	IsHidden           bool
	CapturedAt         time.Time
	UploadedAt         *time.Time
	ProcessedAt        *time.Time
	SizeBytes          int64
	ProcessedSizeBytes *int64
	ThumbnailSizeBytes *int64
	ErrorMessage       *string
}

func (r *Repository) ListPhotos(ctx context.Context, eventID string, limit int) ([]AdminPhoto, error) {
	const query = `
SELECT id,
       event_id,
       guest_session_id,
       guest_display_name,
       local_photo_id,
       object_key,
       processed_object_key,
       thumbnail_object_key,
       upload_status,
       is_hidden,
       captured_at,
       uploaded_at,
       processed_at,
       size_bytes,
       processed_size_bytes,
       thumbnail_size_bytes,
       error_message
FROM (
  SELECT p.*, g.guest_display_name
  FROM photos p
  JOIN guest_sessions g ON g.id = p.guest_session_id
  WHERE p.event_id = $1
) photos
ORDER BY captured_at DESC
LIMIT $2`

	rows, err := r.db.Query(ctx, query, eventID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	photos := []AdminPhoto{}
	for rows.Next() {
		photo, err := scanAdminPhoto(rows)
		if err != nil {
			return nil, err
		}
		photos = append(photos, *photo)
	}

	return photos, rows.Err()
}

func (r *Repository) SetPhotoHidden(ctx context.Context, photoID uuid.UUID, hidden bool) (*AdminPhoto, error) {
	const query = `
UPDATE photos
SET is_hidden = $2,
    hidden_at = CASE WHEN $2 THEN now() ELSE NULL END,
    hidden_reason = CASE WHEN $2 THEN 'admin_moderation' ELSE NULL END,
    updated_at = now()
WHERE id = $1
RETURNING id,
          event_id,
          guest_session_id,
          (SELECT guest_display_name FROM guest_sessions WHERE guest_sessions.id = photos.guest_session_id),
          local_photo_id,
          object_key,
          processed_object_key,
          thumbnail_object_key,
          upload_status,
          is_hidden,
          captured_at,
          uploaded_at,
          processed_at,
          size_bytes,
          processed_size_bytes,
          thumbnail_size_bytes,
          error_message`

	photo, err := scanAdminPhoto(r.db.QueryRow(ctx, query, photoID, hidden))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return photo, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanEventWithStats(row scanner) (*EventWithStats, error) {
	var event EventWithStats
	err := row.Scan(
		&event.EventID,
		&event.EventName,
		&event.MaxFrames,
		&event.RevealAt,
		&event.FilterName,
		&event.IsActive,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.Stats.Total,
		&event.Stats.Uploaded,
		&event.Stats.Processing,
		&event.Stats.Processed,
		&event.Stats.Failed,
		&event.Stats.Hidden,
	)
	if err != nil {
		return nil, err
	}

	return &event, nil
}

func scanAdminPhoto(row scanner) (*AdminPhoto, error) {
	var photo AdminPhoto
	var processedObjectKey sql.NullString
	var thumbnailObjectKey sql.NullString
	var uploadedAt sql.NullTime
	var processedAt sql.NullTime
	var processedSizeBytes sql.NullInt64
	var thumbnailSizeBytes sql.NullInt64
	var errorMessage sql.NullString

	err := row.Scan(
		&photo.PhotoID,
		&photo.EventID,
		&photo.GuestSessionID,
		&photo.GuestDisplayName,
		&photo.LocalPhotoID,
		&photo.ObjectKey,
		&processedObjectKey,
		&thumbnailObjectKey,
		&photo.UploadStatus,
		&photo.IsHidden,
		&photo.CapturedAt,
		&uploadedAt,
		&processedAt,
		&photo.SizeBytes,
		&processedSizeBytes,
		&thumbnailSizeBytes,
		&errorMessage,
	)
	if err != nil {
		return nil, err
	}

	if processedObjectKey.Valid {
		photo.ProcessedObjectKey = &processedObjectKey.String
	}
	if thumbnailObjectKey.Valid {
		photo.ThumbnailObjectKey = &thumbnailObjectKey.String
	}
	if uploadedAt.Valid {
		photo.UploadedAt = &uploadedAt.Time
	}
	if processedAt.Valid {
		photo.ProcessedAt = &processedAt.Time
	}
	if processedSizeBytes.Valid {
		photo.ProcessedSizeBytes = &processedSizeBytes.Int64
	}
	if thumbnailSizeBytes.Valid {
		photo.ThumbnailSizeBytes = &thumbnailSizeBytes.Int64
	}
	if errorMessage.Valid {
		photo.ErrorMessage = &errorMessage.String
	}

	return &photo, nil
}
