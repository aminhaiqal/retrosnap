package guests

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GuestSession struct {
	ID                     uuid.UUID
	EventID                string
	GuestDisplayName       string
	TokenHash              string
	UserAgent              *string
	ClientGeneratedGuestID *string
	CreatedAt              time.Time
	LastSeenAt             time.Time
}

type CreateGuestSessionParams struct {
	ID                     uuid.UUID
	EventID                string
	GuestDisplayName       string
	TokenHash              string
	UserAgent              *string
	ClientGeneratedGuestID *string
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, params CreateGuestSessionParams) (*GuestSession, error) {
	const query = `
INSERT INTO guest_sessions (
  id,
  event_id,
  guest_display_name,
  token_hash,
  user_agent,
  client_generated_guest_id
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, event_id, guest_display_name, token_hash, user_agent, client_generated_guest_id, created_at, last_seen_at`

	row := r.db.QueryRow(ctx, query,
		params.ID,
		params.EventID,
		params.GuestDisplayName,
		params.TokenHash,
		params.UserAgent,
		params.ClientGeneratedGuestID,
	)

	return scanGuestSession(row)
}

func (r *Repository) GetByID(ctx context.Context, guestSessionID uuid.UUID) (*GuestSession, error) {
	const query = `
SELECT id, event_id, guest_display_name, token_hash, user_agent, client_generated_guest_id, created_at, last_seen_at
FROM guest_sessions
WHERE id = $1`

	return scanGuestSession(r.db.QueryRow(ctx, query, guestSessionID))
}

func (r *Repository) GetByTokenHash(ctx context.Context, tokenHash string) (*GuestSession, error) {
	const query = `
SELECT id, event_id, guest_display_name, token_hash, user_agent, client_generated_guest_id, created_at, last_seen_at
FROM guest_sessions
WHERE token_hash = $1`

	return scanGuestSession(r.db.QueryRow(ctx, query, tokenHash))
}

func (r *Repository) TouchLastSeen(ctx context.Context, guestSessionID uuid.UUID) error {
	const query = `
UPDATE guest_sessions
SET last_seen_at = now()
WHERE id = $1`

	_, err := r.db.Exec(ctx, query, guestSessionID)
	return err
}

type guestSessionScanner interface {
	Scan(dest ...any) error
}

func scanGuestSession(row guestSessionScanner) (*GuestSession, error) {
	var session GuestSession
	var userAgent sql.NullString
	var clientGeneratedGuestID sql.NullString

	if err := row.Scan(
		&session.ID,
		&session.EventID,
		&session.GuestDisplayName,
		&session.TokenHash,
		&userAgent,
		&clientGeneratedGuestID,
		&session.CreatedAt,
		&session.LastSeenAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}

	if userAgent.Valid {
		session.UserAgent = &userAgent.String
	}
	if clientGeneratedGuestID.Valid {
		session.ClientGeneratedGuestID = &clientGeneratedGuestID.String
	}

	return &session, nil
}
