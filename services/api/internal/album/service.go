package album

import (
	"context"
	"time"

	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/storage"
)

type Service struct {
	repo          *Repository
	objectStorage storage.ObjectStorage
	cfg           *config.Config
}

func NewService(repo *Repository, objectStorage storage.ObjectStorage, cfg *config.Config) *Service {
	return &Service{repo: repo, objectStorage: objectStorage, cfg: cfg}
}

type AlbumResponse struct {
	EventID   string               `json:"eventId"`
	EventName string               `json:"eventName"`
	RevealAt  string               `json:"revealAt"`
	IsActive  bool                 `json:"isActive"`
	IsLocked  bool                 `json:"isLocked"`
	Photos    []AlbumPhotoResponse `json:"photos"`
}

type AlbumPhotoResponse struct {
	PhotoID      string `json:"photoId"`
	LocalPhotoID string `json:"localPhotoId"`
	ThumbnailURL string `json:"thumbnailUrl"`
	ProcessedURL string `json:"processedUrl"`
	CapturedAt   string `json:"capturedAt"`
	ProcessedAt  string `json:"processedAt"`
}

func (s *Service) GetAlbum(ctx context.Context, eventID string, now time.Time) (*AlbumResponse, error) {
	event, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}

	response := &AlbumResponse{
		EventID:   event.EventID,
		EventName: event.EventName,
		RevealAt:  event.RevealAt.Format(time.RFC3339),
		IsActive:  event.IsActive,
		IsLocked:  now.Before(event.RevealAt),
		Photos:    []AlbumPhotoResponse{},
	}

	if response.IsLocked || !event.IsActive {
		return response, nil
	}

	photos, err := s.repo.ListVisiblePhotos(ctx, eventID)
	if err != nil {
		return nil, err
	}

	for _, photo := range photos {
		thumbnailURL, thumbErr := s.sign(ctx, photo.ThumbnailObjectKey)
		processedURL, processedErr := s.sign(ctx, photo.ProcessedObjectKey)
		if thumbErr != nil || processedErr != nil {
			continue
		}

		response.Photos = append(response.Photos, AlbumPhotoResponse{
			PhotoID:      photo.PhotoID.String(),
			LocalPhotoID: photo.LocalPhotoID,
			ThumbnailURL: thumbnailURL,
			ProcessedURL: processedURL,
			CapturedAt:   photo.CapturedAt.Format(time.RFC3339),
			ProcessedAt:  photo.ProcessedAt.Format(time.RFC3339),
		})
	}

	return response, nil
}

func (s *Service) sign(ctx context.Context, objectKey string) (string, error) {
	result, err := s.objectStorage.PresignGetObject(ctx, storage.PresignGetObjectInput{
		Bucket:     s.cfg.S3Bucket,
		ObjectKey:  objectKey,
		Expiration: s.cfg.AdminSignedURLTTL,
	})
	if err != nil {
		return "", err
	}

	return result.URL, nil
}
