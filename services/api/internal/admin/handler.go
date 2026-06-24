package admin

import (
	"crypto/hmac"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/config"
	"retrosnap/services/api/internal/server"
)

type Handler struct {
	service       *Service
	adminAPIToken string
}

func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:       service,
		adminAPIToken: cfg.AdminAPIToken,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/admin/events", h.requireAdmin(h.ListEvents))
	r.Post("/admin/events", h.requireAdmin(h.CreateEvent))
	r.Get("/admin/events/{eventId}", h.requireAdmin(h.GetEvent))
	r.Get("/admin/events/{eventId}/photos", h.requireAdmin(h.ListPhotos))
	r.Patch("/admin/photos/{photoId}", h.requireAdmin(h.ModeratePhoto))
}

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.service.ListEvents(r.Context())
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load events.")
		return
	}

	server.WriteJSON(w, http.StatusOK, map[string]any{"events": events})
}

func (h *Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	event, err := h.service.GetEvent(r.Context(), chi.URLParam(r, "eventId"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			server.WriteError(w, http.StatusNotFound, "not_found", "Event was not found.")
			return
		}
		server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load event.")
		return
	}

	server.WriteJSON(w, http.StatusOK, event)
}

func (h *Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var input CreateEventInput
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
		return
	}

	event, err := h.service.CreateEvent(r.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidRequest):
			server.WriteError(w, http.StatusBadRequest, "invalid_request", "Event details are invalid.")
		case errors.Is(err, ErrDuplicateEvent):
			server.WriteError(w, http.StatusConflict, "duplicate_event", "Event ID already exists.")
		default:
			server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not create event.")
		}
		return
	}

	server.WriteJSON(w, http.StatusCreated, event)
}

func (h *Handler) ListPhotos(w http.ResponseWriter, r *http.Request) {
	photos, err := h.service.ListPhotos(r.Context(), chi.URLParam(r, "eventId"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			server.WriteError(w, http.StatusNotFound, "not_found", "Event was not found.")
			return
		}
		server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load photos.")
		return
	}

	server.WriteJSON(w, http.StatusOK, map[string]any{"photos": photos})
}

type moderatePhotoRequest struct {
	Hidden bool `json:"hidden"`
}

func (h *Handler) ModeratePhoto(w http.ResponseWriter, r *http.Request) {
	var input moderatePhotoRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
		return
	}

	photo, err := h.service.SetPhotoHidden(r.Context(), chi.URLParam(r, "photoId"), input.Hidden)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			server.WriteError(w, http.StatusNotFound, "not_found", "Photo was not found.")
			return
		}
		server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not update photo moderation status.")
		return
	}

	server.WriteJSON(w, http.StatusOK, photo)
}

func (h *Handler) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.adminAPIToken == "" {
			next(w, r)
			return
		}

		token := adminTokenFromRequest(r)
		if !hmac.Equal([]byte(token), []byte(h.adminAPIToken)) {
			server.WriteError(w, http.StatusUnauthorized, "unauthorized", "Admin token is required.")
			return
		}

		next(w, r)
	}
}

func adminTokenFromRequest(r *http.Request) string {
	if token := strings.TrimSpace(r.Header.Get("X-Admin-Token")); token != "" {
		return token
	}

	value := strings.TrimSpace(r.Header.Get("Authorization"))
	token, ok := strings.CutPrefix(value, "Bearer ")
	if !ok {
		return ""
	}

	return strings.TrimSpace(token)
}
