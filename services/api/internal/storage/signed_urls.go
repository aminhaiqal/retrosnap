package storage

import (
	"context"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type ObjectStorage interface {
	PresignPutObject(ctx context.Context, input PresignPutObjectInput) (*PresignPutObjectResult, error)
	PresignGetObject(ctx context.Context, input PresignGetObjectInput) (*PresignGetObjectResult, error)
}

type PresignPutObjectInput struct {
	Bucket      string
	ObjectKey   string
	ContentType string
	Expiration  time.Duration
}

type PresignPutObjectResult struct {
	URL              string
	Method           string
	Headers          map[string]string
	ExpiresInSeconds int
}

type PresignGetObjectInput struct {
	Bucket     string
	ObjectKey  string
	Expiration time.Duration
}

type PresignGetObjectResult struct {
	URL              string
	Method           string
	ExpiresInSeconds int
}

type R2Presigner struct {
	client *s3.PresignClient
}

func NewR2Presigner(client *s3.Client) *R2Presigner {
	return &R2Presigner{
		client: s3.NewPresignClient(client),
	}
}

func (p *R2Presigner) PresignPutObject(ctx context.Context, input PresignPutObjectInput) (*PresignPutObjectResult, error) {
	result, err := p.client.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(input.Bucket),
		Key:         aws.String(input.ObjectKey),
		ContentType: aws.String(input.ContentType),
	}, s3.WithPresignExpires(input.Expiration))
	if err != nil {
		return nil, err
	}

	headers := map[string]string{
		"Content-Type": input.ContentType,
	}
	for key, values := range result.SignedHeader {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	return &PresignPutObjectResult{
		URL:              result.URL,
		Method:           http.MethodPut,
		Headers:          headers,
		ExpiresInSeconds: int(input.Expiration.Seconds()),
	}, nil
}

func (p *R2Presigner) PresignGetObject(ctx context.Context, input PresignGetObjectInput) (*PresignGetObjectResult, error) {
	result, err := p.client.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(input.Bucket),
		Key:    aws.String(input.ObjectKey),
	}, s3.WithPresignExpires(input.Expiration))
	if err != nil {
		return nil, err
	}

	return &PresignGetObjectResult{
		URL:              result.URL,
		Method:           http.MethodGet,
		ExpiresInSeconds: int(input.Expiration.Seconds()),
	}, nil
}
