package uploads

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/events"
	"retrosnap/services/api/internal/guests"
	"retrosnap/services/api/internal/photos"
	"retrosnap/services/api/internal/storage"
)

type Service struct {
	repo          *Repository
	photoRepo     *photos.Repository
	guestService  *guests.Service
	eventService  *events.Service
	objectStorage storage.ObjectStorage
	cfg           *config.Config
	logger        *slog.Logger
}

func NewService(
	repo *Repository,
	photoRepo *photos.Repository,
	guestService *guests.Service,
	eventService *events.Service,
	objectStorage storage.ObjectStorage,
	cfg *config.Config,
	logger *slog.Logger,
) *Service {
	return &Service{
		repo:          repo,
		photoRepo:     photoRepo,
		guestService:  guestService,
		eventService:  eventService,
		objectStorage: objectStorage,
		cfg:           cfg,
		logger:        logger,
	}
}

type ConfirmResponse struct {
	PhotoID      string  `json:"photoId"`
	LocalPhotoID string  `json:"localPhotoId"`
	EventID      string  `json:"eventId"`
	UploadStatus string  `json:"uploadStatus"`
	ObjectKey    string  `json:"objectKey"`
	UploadedAt   *string `json:"uploadedAt,omitempty"`
}

func (s *Service) PresignUpload(ctx context.Context, guestToken string, request PresignRequest) (*PresignResponse, error) {
	capturedAt, err := validatePresignRequest(request, s.cfg.MaxUploadSizeBytes)
	if err != nil {
		return nil, err
	}

	session, err := s.authorizeSession(ctx, guestToken, request.EventID, request.GuestSessionID, true)
	if err != nil {
		return nil, err
	}

	objectKey := GenerateObjectKey(request.EventID, session.ID, strings.TrimSpace(request.LocalPhotoID))

	photo, err := s.repo.GetByEventLocalPhoto(ctx, request.EventID, request.LocalPhotoID)
	if err != nil {
		if !errors.Is(err, photos.ErrNotFound) {
			return nil, err
		}

		photo, err = s.repo.CreatePhoto(ctx, CreatePhotoParams{
			ID:             uuid.New(),
			EventID:        request.EventID,
			GuestSessionID: session.ID,
			LocalPhotoID:   strings.TrimSpace(request.LocalPhotoID),
			ObjectKey:      objectKey,
			ContentType:    request.ContentType,
			SizeBytes:      request.SizeBytes,
			Width:          request.Width,
			Height:         request.Height,
			CapturedAt:     capturedAt,
		})
		if err != nil {
			return nil, err
		}
	}

	if photo.GuestSessionID != session.ID {
		return nil, apiError(http.StatusConflict, "duplicate_photo", "A photo with this local ID already exists for the event.")
	}
	if photo.ObjectKey != objectKey {
		return nil, apiError(http.StatusConflict, "duplicate_photo", "Existing photo object key does not match this upload request.")
	}
	if !isReusableDuplicateStatus(photo.UploadStatus) {
		return nil, apiError(http.StatusConflict, "duplicate_photo", "Existing photo cannot be reused for another upload URL.")
	}
	if !presignMetadataMatches(photo, request) {
		return nil, apiError(http.StatusConflict, "duplicate_photo", "Existing photo metadata does not match this upload request.")
	}

	response, err := buildPresignResponse(ctx, s.cfg, s.objectStorage, photo)
	if err != nil {
		s.logger.Error("presign failed", "event_id", request.EventID, "guest_session_id", session.ID.String(), "error", err)
		return nil, apiError(http.StatusBadGateway, "storage_presign_failed", "Could not create upload URL.")
	}

	return response, nil
}

func (s *Service) ConfirmUpload(ctx context.Context, guestToken string, request ConfirmRequest) (*ConfirmResponse, error) {
	if err := validateConfirmRequest(request); err != nil {
		return nil, err
	}

	session, err := s.authorizeSession(ctx, guestToken, request.EventID, request.GuestSessionID, false)
	if err != nil {
		return nil, err
	}

	photoID, err := uuid.Parse(request.PhotoID)
	if err != nil {
		return nil, apiError(http.StatusNotFound, "not_found", "Photo was not found.")
	}

	photo, err := s.photoRepo.GetByID(ctx, photoID)
	if err != nil {
		if errors.Is(err, photos.ErrNotFound) {
			return nil, apiError(http.StatusNotFound, "not_found", "Photo was not found.")
		}
		return nil, err
	}

	if photo.GuestSessionID != session.ID || photo.EventID != request.EventID {
		return nil, apiError(http.StatusForbidden, "forbidden", "Photo does not belong to this guest session.")
	}
	if photo.LocalPhotoID != request.LocalPhotoID || photo.ObjectKey != request.ObjectKey {
		return nil, apiError(http.StatusBadRequest, "invalid_request", "Upload confirmation does not match the photo record.")
	}

	if photo.UploadStatus != photos.UploadStatusUploaded {
		photo, err = s.repo.MarkUploaded(ctx, photo.ID, request.ETag)
		if err != nil {
			s.logger.Error("confirm failed", "photo_id", request.PhotoID, "error", err)
			return nil, err
		}
	}

	return buildConfirmResponse(photo), nil
}

func (s *Service) authorizeSession(ctx context.Context, guestToken string, eventID string, guestSessionID string, requireActiveEvent bool) (*guests.GuestSession, error) {
	session, err := s.guestService.AuthenticateToken(ctx, guestToken)
	if err != nil {
		if !errors.Is(err, guests.ErrUnauthorized) {
			return nil, err
		}
		return nil, apiError(http.StatusUnauthorized, "unauthorized", "Guest token is invalid.")
	}

	parsedGuestSessionID, err := uuid.Parse(guestSessionID)
	if err != nil {
		return nil, apiError(http.StatusBadRequest, "invalid_request", "Guest session ID must be a valid UUID.")
	}

	if session.ID != parsedGuestSessionID || session.EventID != eventID {
		return nil, apiError(http.StatusForbidden, "forbidden", "Guest session does not belong to this event.")
	}

	if requireActiveEvent {
		if _, err := s.eventService.RequireActiveEvent(ctx, eventID); err != nil {
			if errors.Is(err, events.ErrNotFound) {
				return nil, apiError(http.StatusNotFound, "not_found", "Event was not found.")
			}
			if errors.Is(err, events.ErrInactive) {
				return nil, apiError(http.StatusForbidden, "event_inactive", "Event is not active.")
			}
			return nil, err
		}
	}

	return session, nil
}

func buildConfirmResponse(photo *photos.Photo) *ConfirmResponse {
	response := &ConfirmResponse{
		PhotoID:      photo.ID.String(),
		LocalPhotoID: photo.LocalPhotoID,
		EventID:      photo.EventID,
		UploadStatus: string(photo.UploadStatus),
		ObjectKey:    photo.ObjectKey,
	}

	if photo.UploadedAt != nil {
		uploadedAt := photo.UploadedAt.Format(timeFormat)
		response.UploadedAt = &uploadedAt
	}

	return response
}

const timeFormat = "2006-01-02T15:04:05Z07:00"

func isReusableDuplicateStatus(status photos.UploadStatus) bool {
	return status == photos.UploadStatusPresigned || status == photos.UploadStatusUploaded
}

func presignMetadataMatches(photo *photos.Photo, request PresignRequest) bool {
	return photo.ContentType == request.ContentType &&
		photo.SizeBytes == request.SizeBytes &&
		photo.Width == request.Width &&
		photo.Height == request.Height
}
