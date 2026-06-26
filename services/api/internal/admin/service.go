package admin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/storage"
)

var (
	ErrInvalidRequest = errors.New("invalid request")
	ErrDuplicateEvent = errors.New("duplicate event")
)

type Service struct {
	repo          *Repository
	objectStorage storage.ObjectStorage
	cfg           *config.Config
	logger        *slog.Logger
}

func NewService(repo *Repository, objectStorage storage.ObjectStorage, cfg *config.Config, logger *slog.Logger) *Service {
	return &Service{
		repo:          repo,
		objectStorage: objectStorage,
		cfg:           cfg,
		logger:        logger,
	}
}

type EventResponse struct {
	EventID        string     `json:"eventId"`
	EventName      string     `json:"eventName"`
	MaxFrames      int        `json:"maxFrames"`
	RevealAt       string     `json:"revealAt"`
	FilterName     string     `json:"filterName"`
	IsActive       bool       `json:"isActive"`
	GuestCameraURL string     `json:"guestCameraUrl"`
	AlbumURL       string     `json:"albumUrl"`
	CreatedAt      string     `json:"createdAt"`
	UpdatedAt      string     `json:"updatedAt"`
	Stats          EventStats `json:"stats"`
}

type CreateEventInput struct {
	EventID    string `json:"eventId"`
	EventName  string `json:"eventName"`
	MaxFrames  int    `json:"maxFrames"`
	RevealAt   string `json:"revealAt"`
	FilterName string `json:"filterName"`
	IsActive   *bool  `json:"isActive"`
}

type PhotoResponse struct {
	PhotoID            string  `json:"photoId"`
	EventID            string  `json:"eventId"`
	GuestSessionID     string  `json:"guestSessionId"`
	GuestDisplayName   string  `json:"guestDisplayName"`
	LocalPhotoID       string  `json:"localPhotoId"`
	UploadStatus       string  `json:"uploadStatus"`
	IsHidden           bool    `json:"isHidden"`
	PreviewURL         *string `json:"previewUrl,omitempty"`
	PreviewObjectKey   *string `json:"previewObjectKey,omitempty"`
	OriginalObjectKey  string  `json:"originalObjectKey"`
	ProcessedObjectKey *string `json:"processedObjectKey,omitempty"`
	ThumbnailObjectKey *string `json:"thumbnailObjectKey,omitempty"`
	CapturedAt         string  `json:"capturedAt"`
	UploadedAt         *string `json:"uploadedAt,omitempty"`
	ProcessedAt        *string `json:"processedAt,omitempty"`
	SizeBytes          int64   `json:"sizeBytes"`
	ProcessedSizeBytes *int64  `json:"processedSizeBytes,omitempty"`
	ThumbnailSizeBytes *int64  `json:"thumbnailSizeBytes,omitempty"`
	ErrorMessage       *string `json:"errorMessage,omitempty"`
}

type ExportPhotoLink struct {
	PhotoID            string `json:"photoId"`
	LocalPhotoID       string `json:"localPhotoId"`
	ProcessedObjectKey string `json:"processedObjectKey"`
	DownloadURL        string `json:"downloadUrl"`
}

type ExportLinksResponse struct {
	EventID     string            `json:"eventId"`
	Mode        string            `json:"mode"`
	Photos      []ExportPhotoLink `json:"photos"`
	Limitations string            `json:"limitations"`
}

func (s *Service) ListEvents(ctx context.Context) ([]EventResponse, error) {
	events, err := s.repo.ListEvents(ctx)
	if err != nil {
		return nil, err
	}

	response := make([]EventResponse, 0, len(events))
	for _, event := range events {
		response = append(response, s.toEventResponse(event))
	}

	return response, nil
}

func (s *Service) GetEvent(ctx context.Context, eventID string) (*EventResponse, error) {
	event, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}

	response := s.toEventResponse(*event)
	return &response, nil
}

func (s *Service) CreateEvent(ctx context.Context, input CreateEventInput) (*EventResponse, error) {
	params, err := normalizeCreateEventInput(input)
	if err != nil {
		return nil, err
	}

	event, err := s.repo.CreateEvent(ctx, params)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return nil, ErrDuplicateEvent
		}
		return nil, err
	}

	response := s.toEventResponse(*event)
	return &response, nil
}

func (s *Service) ListPhotos(ctx context.Context, eventID string) ([]PhotoResponse, error) {
	if _, err := s.repo.GetEvent(ctx, eventID); err != nil {
		return nil, err
	}

	photos, err := s.repo.ListPhotos(ctx, eventID, 200)
	if err != nil {
		return nil, err
	}

	response := make([]PhotoResponse, 0, len(photos))
	for _, photo := range photos {
		response = append(response, s.toPhotoResponse(ctx, photo))
	}

	return response, nil
}

func (s *Service) SetPhotoHidden(ctx context.Context, photoID string, hidden bool) (*PhotoResponse, error) {
	parsedPhotoID, err := uuid.Parse(photoID)
	if err != nil {
		return nil, ErrNotFound
	}

	photo, err := s.repo.SetPhotoHidden(ctx, parsedPhotoID, hidden)
	if err != nil {
		return nil, err
	}

	response := s.toPhotoResponse(ctx, *photo)
	return &response, nil
}

func (s *Service) ExportLinks(ctx context.Context, eventID string) (*ExportLinksResponse, error) {
	if _, err := s.repo.GetEvent(ctx, eventID); err != nil {
		return nil, err
	}

	photos, err := s.repo.ListPhotos(ctx, eventID, 1000)
	if err != nil {
		return nil, err
	}

	links := make([]ExportPhotoLink, 0, len(photos))
	for _, photo := range photos {
		if photo.IsHidden || photo.UploadStatus != "processed" || photo.ProcessedObjectKey == nil {
			continue
		}

		result, err := s.objectStorage.PresignGetObject(ctx, storage.PresignGetObjectInput{
			Bucket:     s.cfg.R2Bucket,
			ObjectKey:  *photo.ProcessedObjectKey,
			Expiration: s.cfg.AdminSignedURLTTL,
		})
		if err != nil {
			s.logger.Warn("admin export link presign failed", "photo_id", photo.PhotoID.String(), "error", err)
			continue
		}

		links = append(links, ExportPhotoLink{
			PhotoID:            photo.PhotoID.String(),
			LocalPhotoID:       photo.LocalPhotoID,
			ProcessedObjectKey: *photo.ProcessedObjectKey,
			DownloadURL:        result.URL,
		})
	}

	return &ExportLinksResponse{
		EventID:     eventID,
		Mode:        "signed_links",
		Photos:      links,
		Limitations: "MVP export returns temporary signed processed-image links instead of generating a ZIP.",
	}, nil
}

func (s *Service) toPhotoResponse(ctx context.Context, photo AdminPhoto) PhotoResponse {
	previewObjectKey := choosePreviewObjectKey(photo)
	var previewURL *string

	if previewObjectKey != nil {
		result, err := s.objectStorage.PresignGetObject(ctx, storage.PresignGetObjectInput{
			Bucket:     s.cfg.R2Bucket,
			ObjectKey:  *previewObjectKey,
			Expiration: s.cfg.AdminSignedURLTTL,
		})
		if err != nil {
			s.logger.Warn("admin preview presign failed", "photo_id", photo.PhotoID.String(), "error", err)
		} else {
			previewURL = &result.URL
		}
	}

	response := PhotoResponse{
		PhotoID:            photo.PhotoID.String(),
		EventID:            photo.EventID,
		GuestSessionID:     photo.GuestSessionID.String(),
		GuestDisplayName:   photo.GuestDisplayName,
		LocalPhotoID:       photo.LocalPhotoID,
		UploadStatus:       photo.UploadStatus,
		IsHidden:           photo.IsHidden,
		PreviewURL:         previewURL,
		PreviewObjectKey:   previewObjectKey,
		OriginalObjectKey:  photo.ObjectKey,
		ProcessedObjectKey: photo.ProcessedObjectKey,
		ThumbnailObjectKey: photo.ThumbnailObjectKey,
		CapturedAt:         photo.CapturedAt.Format(time.RFC3339),
		SizeBytes:          photo.SizeBytes,
		ProcessedSizeBytes: photo.ProcessedSizeBytes,
		ThumbnailSizeBytes: photo.ThumbnailSizeBytes,
		ErrorMessage:       photo.ErrorMessage,
	}

	if photo.UploadedAt != nil {
		value := photo.UploadedAt.Format(time.RFC3339)
		response.UploadedAt = &value
	}
	if photo.ProcessedAt != nil {
		value := photo.ProcessedAt.Format(time.RFC3339)
		response.ProcessedAt = &value
	}

	return response
}

func (s *Service) toEventResponse(event EventWithStats) EventResponse {
	return EventResponse{
		EventID:        event.EventID,
		EventName:      event.EventName,
		MaxFrames:      event.MaxFrames,
		RevealAt:       event.RevealAt.Format(time.RFC3339),
		FilterName:     event.FilterName,
		IsActive:       event.IsActive,
		GuestCameraURL: s.cfg.PublicGuestAppURL + "/e/" + event.EventID,
		AlbumURL:       s.cfg.PublicGuestAppURL + "/e/" + event.EventID + "/album",
		CreatedAt:      event.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      event.UpdatedAt.Format(time.RFC3339),
		Stats:          event.Stats,
	}
}

func normalizeCreateEventInput(input CreateEventInput) (CreateEventParams, error) {
	eventName := strings.TrimSpace(input.EventName)
	if eventName == "" {
		eventName = "Demo Wedding"
	}
	if len([]rune(eventName)) > 120 {
		return CreateEventParams{}, ErrInvalidRequest
	}

	eventID := strings.TrimSpace(input.EventID)
	if eventID == "" {
		eventID = fmt.Sprintf("demo-%s-%d", slugify(eventName), time.Now().Unix())
	}
	if !eventIDPattern.MatchString(eventID) {
		return CreateEventParams{}, ErrInvalidRequest
	}

	maxFrames := input.MaxFrames
	if maxFrames <= 0 {
		maxFrames = 27
	}

	revealAt := time.Now().Add(30 * 24 * time.Hour)
	if strings.TrimSpace(input.RevealAt) != "" {
		parsedRevealAt, err := time.Parse(time.RFC3339, input.RevealAt)
		if err != nil {
			return CreateEventParams{}, ErrInvalidRequest
		}
		revealAt = parsedRevealAt
	}

	filterName := strings.TrimSpace(input.FilterName)
	if filterName == "" {
		filterName = "Malaysian Vintage"
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	return CreateEventParams{
		EventID:    eventID,
		EventName:  eventName,
		MaxFrames:  maxFrames,
		RevealAt:   revealAt,
		FilterName: filterName,
		IsActive:   isActive,
	}, nil
}

func choosePreviewObjectKey(photo AdminPhoto) *string {
	if photo.ThumbnailObjectKey != nil {
		return photo.ThumbnailObjectKey
	}
	if photo.ProcessedObjectKey != nil {
		return photo.ProcessedObjectKey
	}
	return &photo.ObjectKey
}

func slugify(value string) string {
	lower := strings.ToLower(value)
	parts := slugPartPattern.FindAllString(lower, -1)
	if len(parts) == 0 {
		return "event"
	}
	slug := strings.Join(parts, "-")
	if len(slug) > 48 {
		return slug[:48]
	}
	return slug
}

var (
	eventIDPattern  = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)
	slugPartPattern = regexp.MustCompile(`[a-z0-9]+`)
)
