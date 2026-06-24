package storage

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/service/s3"

	"retrosnap/services/api/internal/config"
)

func NewR2Client(ctx context.Context, cfg *config.Config) (*s3.Client, error) {
	return NewS3Client(ctx, S3ClientConfig{
		Endpoint:        cfg.S3Endpoint,
		Region:          cfg.S3Region,
		AccessKeyID:     cfg.S3AccessKeyID,
		SecretAccessKey: cfg.S3SecretAccessKey,
		ForcePathStyle:  cfg.S3ForcePathStyle,
	})
}
