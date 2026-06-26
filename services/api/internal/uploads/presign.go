package uploads

import (
	"context"

	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/photos"
	"retrosnap/services/api/internal/storage"
)

type PresignResponse struct {
	PhotoID          string            `json:"photoId"`
	LocalPhotoID     string            `json:"localPhotoId"`
	ObjectKey        string            `json:"objectKey"`
	UploadURL        string            `json:"uploadUrl"`
	Method           string            `json:"method"`
	ExpiresInSeconds int               `json:"expiresInSeconds"`
	Headers          map[string]string `json:"headers"`
}

func buildPresignResponse(
	ctx context.Context,
	cfg *config.Config,
	objectStorage storage.ObjectStorage,
	photo *photos.Photo,
) (*PresignResponse, error) {
	result, err := objectStorage.PresignPutObject(ctx, storage.PresignPutObjectInput{
		Bucket:      cfg.R2Bucket,
		ObjectKey:   photo.ObjectKey,
		ContentType: photo.ContentType,
		Expiration:  cfg.PresignedUploadTTL,
	})
	if err != nil {
		return nil, err
	}

	return &PresignResponse{
		PhotoID:          photo.ID.String(),
		LocalPhotoID:     photo.LocalPhotoID,
		ObjectKey:        photo.ObjectKey,
		UploadURL:        result.URL,
		Method:           result.Method,
		ExpiresInSeconds: result.ExpiresInSeconds,
		Headers:          result.Headers,
	}, nil
}
