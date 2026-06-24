package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv                    string
	HTTPAddr                  string
	DatabaseURL               string
	CORSAllowedOrigins        []string
	GuestTokenSecret          string
	S3Endpoint                string
	S3Region                  string
	S3Bucket                  string
	S3AccessKeyID             string
	S3SecretAccessKey         string
	S3ForcePathStyle          bool
	PresignedUploadTTL        time.Duration
	PresignedUploadTTLSeconds int
	MaxUploadSizeBytes        int64
}

func Load() (*Config, error) {
	ttlSeconds := getEnvInt("PRESIGNED_UPLOAD_TTL_SECONDS", 900)
	cfg := &Config{
		AppEnv:                    getEnv("APP_ENV", "development"),
		HTTPAddr:                  getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL:               getEnv("DATABASE_URL", "postgres://retrosnap:retrosnap@localhost:5432/retrosnap?sslmode=disable"),
		CORSAllowedOrigins:        splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")),
		GuestTokenSecret:          getEnv("GUEST_TOKEN_SECRET", "change-me-in-production"),
		S3Endpoint:                strings.TrimSpace(os.Getenv("S3_ENDPOINT")),
		S3Region:                  getEnv("S3_REGION", "auto"),
		S3Bucket:                  strings.TrimSpace(os.Getenv("S3_BUCKET")),
		S3AccessKeyID:             strings.TrimSpace(os.Getenv("S3_ACCESS_KEY_ID")),
		S3SecretAccessKey:         strings.TrimSpace(os.Getenv("S3_SECRET_ACCESS_KEY")),
		S3ForcePathStyle:          getEnvBool("S3_FORCE_PATH_STYLE", true),
		PresignedUploadTTL:        time.Duration(ttlSeconds) * time.Second,
		PresignedUploadTTLSeconds: ttlSeconds,
		MaxUploadSizeBytes:        int64(getEnvInt("MAX_UPLOAD_SIZE_BYTES", 8*1024*1024)),
	}

	return cfg, cfg.Validate()
}

func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func (c Config) Validate() error {
	var missing []string

	if c.HTTPAddr == "" {
		missing = append(missing, "HTTP_ADDR")
	}
	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if c.GuestTokenSecret == "" {
		missing = append(missing, "GUEST_TOKEN_SECRET")
	}
	if c.PresignedUploadTTL <= 0 {
		return errors.New("PRESIGNED_UPLOAD_TTL_SECONDS must be greater than zero")
	}
	if c.MaxUploadSizeBytes <= 0 {
		return errors.New("MAX_UPLOAD_SIZE_BYTES must be greater than zero")
	}

	for name, value := range map[string]string{
		"S3_ENDPOINT":          c.S3Endpoint,
		"S3_BUCKET":            c.S3Bucket,
		"S3_ACCESS_KEY_ID":     c.S3AccessKeyID,
		"S3_SECRET_ACCESS_KEY": c.S3SecretAccessKey,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}

	if c.IsProduction() && c.GuestTokenSecret == "change-me-in-production" {
		return errors.New("GUEST_TOKEN_SECRET must be changed in production")
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required config: %s", strings.Join(missing, ", "))
	}

	return nil
}

func getEnv(name string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvBool(name string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}

	return out
}
