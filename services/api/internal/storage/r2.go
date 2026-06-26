package storage

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/service/s3"

	"retrosnap/services/api/internal/config"
)

func NewR2Client(ctx context.Context, cfg *config.Config) (*s3.Client, error) {
	return NewS3Client(ctx, S3ClientConfig{
		Endpoint:        cfg.R2Endpoint,
		Region:          cfg.R2Region,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		ForcePathStyle:  cfg.R2ForcePathStyle,
	})
}
