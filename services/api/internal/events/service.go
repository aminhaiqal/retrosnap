package events

import (
	"context"
	"errors"
)

var (
	ErrNotFound = errors.New("event not found")
	ErrInactive = errors.New("event is inactive")
)

type Service struct {
	repo              *Repository
	publicGuestAppURL string
}

func NewService(repo *Repository, publicGuestAppURL string) *Service {
	return &Service{repo: repo, publicGuestAppURL: publicGuestAppURL}
}

func (s *Service) GetPublicEvent(ctx context.Context, eventID string) (*PublicEventResponse, error) {
	event, err := s.repo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	return &PublicEventResponse{
		EventID:        event.ID,
		EventName:      event.EventName,
		MaxFrames:      event.MaxFrames,
		RevealAt:       event.RevealAt.Format("2006-01-02T15:04:05Z07:00"),
		FilterName:     event.FilterName,
		IsActive:       event.IsActive,
		GuestCameraURL: s.publicGuestAppURL + "/e/" + event.ID,
		AlbumURL:       s.publicGuestAppURL + "/e/" + event.ID + "/album",
	}, nil
}

func (s *Service) RequireActiveEvent(ctx context.Context, eventID string) (*Event, error) {
	event, err := s.repo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if !event.IsActive {
		return nil, ErrInactive
	}

	return event, nil
}

type PublicEventResponse struct {
	EventID        string `json:"eventId"`
	EventName      string `json:"eventName"`
	MaxFrames      int    `json:"maxFrames"`
	RevealAt       string `json:"revealAt"`
	FilterName     string `json:"filterName"`
	IsActive       bool   `json:"isActive"`
	GuestCameraURL string `json:"guestCameraUrl"`
	AlbumURL       string `json:"albumUrl"`
}
