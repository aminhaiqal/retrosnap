package album

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

type Event struct {
	EventID    string
	EventName  string
	MaxFrames  int
	RevealAt   time.Time
	FilterName string
	IsActive   bool
}

type AlbumPhoto struct {
	PhotoID            uuid.UUID
	LocalPhotoID       string
	ProcessedObjectKey string
	ThumbnailObjectKey string
	CapturedAt         time.Time
	ProcessedAt        time.Time
}

func (r *Repository) GetEvent(ctx context.Context, eventID string) (*Event, error) {
	const query = `
SELECT id, event_name, max_frames, reveal_at, filter_name, is_active
FROM events
WHERE id = $1`

	var event Event
	if err := r.db.QueryRow(ctx, query, eventID).Scan(
		&event.EventID,
		&event.EventName,
		&event.MaxFrames,
		&event.RevealAt,
		&event.FilterName,
		&event.IsActive,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &event, nil
}

func (r *Repository) ListVisiblePhotos(ctx context.Context, eventID string) ([]AlbumPhoto, error) {
	const query = `
SELECT id, local_photo_id, processed_object_key, thumbnail_object_key, captured_at, processed_at
FROM photos
WHERE event_id = $1
  AND upload_status = 'processed'
  AND is_hidden = false
  AND processed_object_key IS NOT NULL
  AND thumbnail_object_key IS NOT NULL
ORDER BY captured_at ASC`

	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	photos := []AlbumPhoto{}
	for rows.Next() {
		var photo AlbumPhoto
		var processedAt sql.NullTime
		if err := rows.Scan(
			&photo.PhotoID,
			&photo.LocalPhotoID,
			&photo.ProcessedObjectKey,
			&photo.ThumbnailObjectKey,
			&photo.CapturedAt,
			&processedAt,
		); err != nil {
			return nil, err
		}
		if processedAt.Valid {
			photo.ProcessedAt = processedAt.Time
		}
		photos = append(photos, photo)
	}

	return photos, rows.Err()
}
