package guests

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/events"
	"retrosnap/services/api/internal/server"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/events/{eventId}/guest-sessions", h.CreateGuestSession)
}

type createGuestSessionRequest struct {
	GuestDisplayName       string `json:"guestDisplayName"`
	ClientGeneratedGuestID string `json:"clientGeneratedGuestId"`
}

func (h *Handler) CreateGuestSession(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	if eventID == "" {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Event ID is required.")
		return
	}

	var request createGuestSessionRequest
	if err := server.DecodeJSON(r, &request); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
		return
	}

	response, err := h.service.CreateGuestSession(r.Context(), CreateGuestSessionInput{
		EventID:                eventID,
		GuestDisplayName:       request.GuestDisplayName,
		ClientGeneratedGuestID: request.ClientGeneratedGuestID,
		UserAgent:              r.UserAgent(),
	})
	if err != nil {
		switch {
		case errors.Is(err, events.ErrNotFound):
			server.WriteError(w, http.StatusNotFound, "not_found", "Event was not found.")
		case errors.Is(err, events.ErrInactive):
			server.WriteError(w, http.StatusForbidden, "event_inactive", "Event is not active.")
		case errors.Is(err, ErrInvalidGuestDisplayName):
			server.WriteError(w, http.StatusBadRequest, "invalid_request", "Guest display name must be 80 characters or fewer.")
		default:
			server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not create guest session.")
		}
		return
	}

	server.WriteJSON(w, http.StatusCreated, response)
}
