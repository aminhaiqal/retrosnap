package events

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/server"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/events/{eventId}/public", h.GetPublicEvent)
}

func (h *Handler) GetPublicEvent(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	if eventID == "" {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Event ID is required.")
		return
	}

	event, err := h.service.GetPublicEvent(r.Context(), eventID)
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
