package uploads

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"retrosnap/services/api/internal/photos"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type CreatePhotoParams struct {
	ID             uuid.UUID
	EventID        string
	GuestSessionID uuid.UUID
	LocalPhotoID   string
	ObjectKey      string
	ContentType    string
	SizeBytes      int64
	Width          int
	Height         int
	CapturedAt     time.Time
}

func (r *Repository) GetByEventLocalPhoto(ctx context.Context, eventID string, localPhotoID string) (*photos.Photo, error) {
	const query = `
SELECT id, event_id, guest_session_id, local_photo_id, object_key, content_type, size_bytes, width, height,
       captured_at, upload_status, etag, error_message, created_at, uploaded_at, updated_at
FROM photos
WHERE event_id = $1 AND local_photo_id = $2`

	photo, err := photos.ScanPhoto(r.db.QueryRow(ctx, query, eventID, localPhotoID))
	if err != nil {
		if errors.Is(err, photos.ErrNotFound) {
			return nil, photos.ErrNotFound
		}
		return nil, err
	}

	return photo, nil
}

func (r *Repository) CreatePhoto(ctx context.Context, params CreatePhotoParams) (*photos.Photo, error) {
	const query = `
INSERT INTO photos (
  id,
  event_id,
  guest_session_id,
  local_photo_id,
  object_key,
  content_type,
  size_bytes,
  width,
  height,
  captured_at,
  upload_status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'presigned')
RETURNING id, event_id, guest_session_id, local_photo_id, object_key, content_type, size_bytes, width, height,
          captured_at, upload_status, etag, error_message, created_at, uploaded_at, updated_at`

	photo, err := photos.ScanPhoto(r.db.QueryRow(ctx, query,
		params.ID,
		params.EventID,
		params.GuestSessionID,
		params.LocalPhotoID,
		params.ObjectKey,
		params.ContentType,
		params.SizeBytes,
		params.Width,
		params.Height,
		params.CapturedAt,
	))
	if err != nil {
		if isUniqueViolation(err) {
			return r.GetByEventLocalPhoto(ctx, params.EventID, params.LocalPhotoID)
		}
		return nil, err
	}

	return photo, nil
}

func (r *Repository) MarkUploaded(ctx context.Context, photoID uuid.UUID, etag string) (*photos.Photo, error) {
	const query = `
UPDATE photos
SET upload_status = 'uploaded',
    etag = COALESCE(NULLIF($2, ''), etag),
    uploaded_at = COALESCE(uploaded_at, now()),
    updated_at = now()
WHERE id = $1
RETURNING id, event_id, guest_session_id, local_photo_id, object_key, content_type, size_bytes, width, height,
          captured_at, upload_status, etag, error_message, created_at, uploaded_at, updated_at`

	return photos.ScanPhoto(r.db.QueryRow(ctx, query, photoID, etag))
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
