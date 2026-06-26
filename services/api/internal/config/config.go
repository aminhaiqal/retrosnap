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
	AdminAPIToken             string
	PublicGuestAppURL         string
	PublicDashboardURL        string
	PublicAPIURL              string
	R2Endpoint                string
	R2Region                  string
	R2Bucket                  string
	R2AccessKeyID             string
	R2SecretAccessKey         string
	R2ForcePathStyle          bool
	PresignedUploadTTL        time.Duration
	PresignedUploadTTLSeconds int
	AdminSignedURLTTL         time.Duration
	AdminSignedURLTTLSeconds  int
	MaxUploadSizeBytes        int64
}

func Load() (*Config, error) {
	ttlSeconds := getEnvInt("PRESIGNED_UPLOAD_TTL_SECONDS", 900)
	adminURLTTLSeconds := getEnvInt("ADMIN_SIGNED_URL_TTL_SECONDS", 600)
	cfg := &Config{
		AppEnv:                    getEnv("APP_ENV", "development"),
		HTTPAddr:                  getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL:               getEnv("DATABASE_URL", "postgres://retrosnap:retrosnap@localhost:5432/retrosnap?sslmode=disable"),
		CORSAllowedOrigins:        splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175")),
		GuestTokenSecret:          getEnv("GUEST_TOKEN_SECRET", "change-me-in-production"),
		AdminAPIToken:             firstNonEmpty("ADMIN_TOKEN", "ADMIN_API_TOKEN"),
		PublicGuestAppURL:         strings.TrimRight(getEnv("PUBLIC_GUEST_APP_URL", "http://localhost:5173"), "/"),
		PublicDashboardURL:        strings.TrimRight(getEnv("PUBLIC_DASHBOARD_URL", "http://localhost:5175"), "/"),
		PublicAPIURL:              strings.TrimRight(getEnv("PUBLIC_API_URL", "http://localhost:8080"), "/"),
		R2Endpoint:                strings.TrimSpace(os.Getenv("R2_ENDPOINT")),
		R2Region:                  getEnv("R2_REGION", "auto"),
		R2Bucket:                  strings.TrimSpace(os.Getenv("R2_BUCKET")),
		R2AccessKeyID:             strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID")),
		R2SecretAccessKey:         strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY")),
		R2ForcePathStyle:          getEnvBool("R2_FORCE_PATH_STYLE", true),
		PresignedUploadTTL:        time.Duration(ttlSeconds) * time.Second,
		PresignedUploadTTLSeconds: ttlSeconds,
		AdminSignedURLTTL:         time.Duration(adminURLTTLSeconds) * time.Second,
		AdminSignedURLTTLSeconds:  adminURLTTLSeconds,
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
	if c.AdminSignedURLTTL <= 0 {
		return errors.New("ADMIN_SIGNED_URL_TTL_SECONDS must be greater than zero")
	}
	if c.MaxUploadSizeBytes <= 0 {
		return errors.New("MAX_UPLOAD_SIZE_BYTES must be greater than zero")
	}

	for name, value := range map[string]string{
		"R2_ENDPOINT":          c.R2Endpoint,
		"R2_BUCKET":            c.R2Bucket,
		"R2_ACCESS_KEY_ID":     c.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY": c.R2SecretAccessKey,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}

	if c.IsProduction() && c.GuestTokenSecret == "change-me-in-production" {
		return errors.New("GUEST_TOKEN_SECRET must be changed in production")
	}
	if c.IsProduction() && c.AdminAPIToken == "" {
		return errors.New("ADMIN_API_TOKEN is required in production")
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

func firstNonEmpty(names ...string) string {
	for _, name := range names {
		if value := strings.TrimSpace(os.Getenv(name)); value != "" {
			return value
		}
	}
	return ""
}
