package guests

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"retrosnap/services/api/internal/events"
)

var (
	ErrInvalidGuestDisplayName = errors.New("invalid guest display name")
	ErrUnauthorized            = errors.New("unauthorized")
	ErrForbidden               = errors.New("forbidden")
)

type Service struct {
	repo             *Repository
	eventService     *events.Service
	guestTokenSecret string
}

func NewService(repo *Repository, eventService *events.Service, guestTokenSecret string) *Service {
	return &Service{
		repo:             repo,
		eventService:     eventService,
		guestTokenSecret: guestTokenSecret,
	}
}

type CreateGuestSessionInput struct {
	EventID                string
	GuestDisplayName       string
	ClientGeneratedGuestID string
	UserAgent              string
}

type CreateGuestSessionOutput struct {
	GuestSessionID   string `json:"guestSessionId"`
	GuestToken       string `json:"guestToken"`
	EventID          string `json:"eventId"`
	GuestDisplayName string `json:"guestDisplayName"`
	CreatedAt        string `json:"createdAt"`
}

func (s *Service) CreateGuestSession(ctx context.Context, input CreateGuestSessionInput) (*CreateGuestSessionOutput, error) {
	if _, err := s.eventService.RequireActiveEvent(ctx, input.EventID); err != nil {
		return nil, err
	}

	displayName, err := normalizeGuestDisplayName(input.GuestDisplayName)
	if err != nil {
		return nil, err
	}

	token, err := GenerateGuestToken()
	if err != nil {
		return nil, err
	}

	sessionID := uuid.New()
	session, err := s.repo.Create(ctx, CreateGuestSessionParams{
		ID:                     sessionID,
		EventID:                input.EventID,
		GuestDisplayName:       displayName,
		TokenHash:              HashGuestToken(s.guestTokenSecret, token),
		UserAgent:              optionalString(input.UserAgent),
		ClientGeneratedGuestID: optionalString(input.ClientGeneratedGuestID),
	})
	if err != nil {
		return nil, err
	}

	return &CreateGuestSessionOutput{
		GuestSessionID:   session.ID.String(),
		GuestToken:       token,
		EventID:          session.EventID,
		GuestDisplayName: session.GuestDisplayName,
		CreatedAt:        session.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func (s *Service) AuthenticateToken(ctx context.Context, guestToken string) (*GuestSession, error) {
	if strings.TrimSpace(guestToken) == "" {
		return nil, ErrUnauthorized
	}

	session, err := s.repo.GetByTokenHash(ctx, HashGuestToken(s.guestTokenSecret, guestToken))
	if err != nil {
		return nil, err
	}

	_ = s.repo.TouchLastSeen(ctx, session.ID)
	return session, nil
}

func normalizeGuestDisplayName(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "Guest", nil
	}

	if len([]rune(trimmed)) > 80 {
		return "", ErrInvalidGuestDisplayName
	}

	return trimmed, nil
}

func optionalString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
