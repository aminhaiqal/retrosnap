package events

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Event struct {
	ID         string
	EventName  string
	MaxFrames  int
	RevealAt   time.Time
	FilterName string
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByID(ctx context.Context, eventID string) (*Event, error) {
	const query = `
SELECT id, event_name, max_frames, reveal_at, filter_name, is_active, created_at, updated_at
FROM events
WHERE id = $1`

	var event Event
	if err := r.db.QueryRow(ctx, query, eventID).Scan(
		&event.ID,
		&event.EventName,
		&event.MaxFrames,
		&event.RevealAt,
		&event.FilterName,
		&event.IsActive,
		&event.CreatedAt,
		&event.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &event, nil
}
