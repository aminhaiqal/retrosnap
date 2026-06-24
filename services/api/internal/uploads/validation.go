package uploads

import (
	"net/http"
	"strings"
	"time"
)

type Error struct {
	Status  int
	Code    string
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

func apiError(status int, code string, message string) *Error {
	return &Error{
		Status:  status,
		Code:    code,
		Message: message,
	}
}

type PresignRequest struct {
	EventID        string `json:"eventId"`
	GuestSessionID string `json:"guestSessionId"`
	LocalPhotoID   string `json:"localPhotoId"`
	ContentType    string `json:"contentType"`
	SizeBytes      int64  `json:"sizeBytes"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
	CapturedAt     string `json:"capturedAt"`
}

type ConfirmRequest struct {
	PhotoID        string `json:"photoId"`
	LocalPhotoID   string `json:"localPhotoId"`
	EventID        string `json:"eventId"`
	GuestSessionID string `json:"guestSessionId"`
	ObjectKey      string `json:"objectKey"`
	ETag           string `json:"etag"`
}

func validatePresignRequest(request PresignRequest, maxUploadSizeBytes int64) (time.Time, error) {
	if strings.TrimSpace(request.EventID) == "" {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Event ID is required.")
	}
	if !ValidateObjectKeyPart(request.EventID) {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Event ID contains unsupported characters.")
	}
	if strings.TrimSpace(request.GuestSessionID) == "" {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Guest session ID is required.")
	}
	if strings.TrimSpace(request.LocalPhotoID) == "" {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Local photo ID is required.")
	}
	if !ValidateObjectKeyPart(request.LocalPhotoID) {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Local photo ID contains unsupported characters.")
	}
	if request.ContentType != "image/jpeg" {
		return time.Time{}, apiError(http.StatusBadRequest, "unsupported_content_type", "Only image/jpeg uploads are supported.")
	}
	if request.SizeBytes <= 0 {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Photo size must be greater than zero.")
	}
	if request.SizeBytes > maxUploadSizeBytes {
		return time.Time{}, apiError(http.StatusRequestEntityTooLarge, "photo_too_large", "Photo size exceeds the maximum allowed upload size.")
	}
	if request.Width <= 0 || request.Height <= 0 {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "Photo width and height must be positive.")
	}

	capturedAt, err := time.Parse(time.RFC3339, request.CapturedAt)
	if err != nil {
		return time.Time{}, apiError(http.StatusBadRequest, "invalid_request", "capturedAt must be a valid timestamp.")
	}

	return capturedAt, nil
}

func validateConfirmRequest(request ConfirmRequest) error {
	if strings.TrimSpace(request.PhotoID) == "" {
		return apiError(http.StatusBadRequest, "invalid_request", "Photo ID is required.")
	}
	if strings.TrimSpace(request.LocalPhotoID) == "" {
		return apiError(http.StatusBadRequest, "invalid_request", "Local photo ID is required.")
	}
	if strings.TrimSpace(request.EventID) == "" {
		return apiError(http.StatusBadRequest, "invalid_request", "Event ID is required.")
	}
	if strings.TrimSpace(request.GuestSessionID) == "" {
		return apiError(http.StatusBadRequest, "invalid_request", "Guest session ID is required.")
	}
	if strings.TrimSpace(request.ObjectKey) == "" {
		return apiError(http.StatusBadRequest, "invalid_request", "Object key is required.")
	}

	return nil
}
