package server

import (
	"log/slog"
	"time"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/config"
)

func NewRouter(cfg *config.Config, logger *slog.Logger) chi.Router {
	r := chi.NewRouter()
	r.Use(Recoverer(logger))
	r.Use(RequestLogger(logger))
	r.Use(CORS(cfg.CORSAllowedOrigins))
	r.Use(RequestTimeout(15 * time.Second))
	return r
}
