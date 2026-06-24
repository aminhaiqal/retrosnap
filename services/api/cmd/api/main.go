package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/admin"
	"retrosnap/services/api/internal/album"
	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/database"
	"retrosnap/services/api/internal/events"
	"retrosnap/services/api/internal/guests"
	"retrosnap/services/api/internal/health"
	"retrosnap/services/api/internal/photos"
	"retrosnap/services/api/internal/server"
	"retrosnap/services/api/internal/storage"
	"retrosnap/services/api/internal/uploads"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		logger.Error("config validation failed", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	db, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	s3Client, err := storage.NewR2Client(ctx, cfg)
	if err != nil {
		logger.Error("storage client setup failed", "error", err)
		os.Exit(1)
	}
	objectStorage := storage.NewR2Presigner(s3Client)

	eventRepo := events.NewRepository(db)
	eventService := events.NewService(eventRepo, cfg.PublicGuestAppURL)
	eventHandler := events.NewHandler(eventService)

	guestRepo := guests.NewRepository(db)
	guestService := guests.NewService(guestRepo, eventService, cfg.GuestTokenSecret)
	guestHandler := guests.NewHandler(guestService)

	photoRepo := photos.NewRepository(db)
	photoService := photos.NewService(photoRepo, guestService)
	photoHandler := photos.NewHandler(photoService)

	uploadRepo := uploads.NewRepository(db)
	uploadService := uploads.NewService(uploadRepo, photoRepo, guestService, eventService, objectStorage, cfg, logger)
	uploadHandler := uploads.NewHandler(uploadService)

	adminRepo := admin.NewRepository(db)
	adminService := admin.NewService(adminRepo, objectStorage, cfg, logger)
	adminHandler := admin.NewHandler(adminService, cfg)

	albumRepo := album.NewRepository(db)
	albumService := album.NewService(albumRepo, objectStorage, cfg)
	albumHandler := album.NewHandler(albumService)

	router := server.NewRouter(cfg, logger)
	health.NewHandler().RegisterRoutes(router)
	router.Route("/api/v1", func(r chi.Router) {
		eventHandler.RegisterRoutes(r)
		guestHandler.RegisterRoutes(r)
		uploadHandler.RegisterRoutes(r)
		photoHandler.RegisterRoutes(r)
		albumHandler.RegisterRoutes(r)
		adminHandler.RegisterRoutes(r)
	})

	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("server starting", "addr", cfg.HTTPAddr, "env", cfg.AppEnv)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			cancel()
		}
	}()

	<-ctx.Done()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
	}
}
