package photos

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"retrosnap/services/api/internal/guests"
)

var ErrForbidden = errors.New("photo forbidden")

type Service struct {
	repo         *Repository
	guestService *guests.Service
}

func NewService(repo *Repository, guestService *guests.Service) *Service {
	return &Service{
		repo:         repo,
		guestService: guestService,
	}
}

type StatusResponse struct {
	PhotoID      string  `json:"photoId"`
	LocalPhotoID string  `json:"localPhotoId"`
	UploadStatus string  `json:"uploadStatus"`
	CreatedAt    string  `json:"createdAt"`
	UploadedAt   *string `json:"uploadedAt,omitempty"`
}

func (s *Service) GetStatus(ctx context.Context, guestToken string, photoIDText string) (*StatusResponse, error) {
	session, err := s.guestService.AuthenticateToken(ctx, guestToken)
	if err != nil {
		return nil, err
	}

	photoID, err := uuid.Parse(photoIDText)
	if err != nil {
		return nil, ErrNotFound
	}

	photo, err := s.repo.GetByID(ctx, photoID)
	if err != nil {
		return nil, err
	}

	if photo.GuestSessionID != session.ID {
		return nil, ErrForbidden
	}

	response := &StatusResponse{
		PhotoID:      photo.ID.String(),
		LocalPhotoID: photo.LocalPhotoID,
		UploadStatus: string(photo.UploadStatus),
		CreatedAt:    photo.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if photo.UploadedAt != nil {
		uploadedAt := photo.UploadedAt.Format("2006-01-02T15:04:05Z07:00")
		response.UploadedAt = &uploadedAt
	}

	return response, nil
}
