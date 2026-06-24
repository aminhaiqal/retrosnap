package photos

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("photo not found")

type Photo struct {
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
	UploadStatus   UploadStatus
	ETag           *string
	ErrorMessage   *string
	CreatedAt      time.Time
	UploadedAt     *time.Time
	UpdatedAt      time.Time
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByID(ctx context.Context, photoID uuid.UUID) (*Photo, error) {
	const query = `
SELECT id, event_id, guest_session_id, local_photo_id, object_key, content_type, size_bytes, width, height,
       captured_at, upload_status, etag, error_message, created_at, uploaded_at, updated_at
FROM photos
WHERE id = $1`

	return ScanPhoto(r.db.QueryRow(ctx, query, photoID))
}

type Scanner interface {
	Scan(dest ...any) error
}

func ScanPhoto(row Scanner) (*Photo, error) {
	var photo Photo
	var etag sql.NullString
	var errorMessage sql.NullString
	var uploadedAt sql.NullTime
	var uploadStatus string

	if err := row.Scan(
		&photo.ID,
		&photo.EventID,
		&photo.GuestSessionID,
		&photo.LocalPhotoID,
		&photo.ObjectKey,
		&photo.ContentType,
		&photo.SizeBytes,
		&photo.Width,
		&photo.Height,
		&photo.CapturedAt,
		&uploadStatus,
		&etag,
		&errorMessage,
		&photo.CreatedAt,
		&uploadedAt,
		&photo.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	photo.UploadStatus = UploadStatus(uploadStatus)
	if etag.Valid {
		photo.ETag = &etag.String
	}
	if errorMessage.Valid {
		photo.ErrorMessage = &errorMessage.String
	}
	if uploadedAt.Valid {
		photo.UploadedAt = &uploadedAt.Time
	}

	return &photo, nil
}
