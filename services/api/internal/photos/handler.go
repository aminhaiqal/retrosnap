package photos

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/guests"
	"retrosnap/services/api/internal/server"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/photos/{photoId}/status", h.GetStatus)
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	token, ok := guests.BearerToken(r.Header.Get("Authorization"))
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "unauthorized", "Guest token is required.")
		return
	}

	response, err := h.service.GetStatus(r.Context(), token, chi.URLParam(r, "photoId"))
	if err != nil {
		switch {
		case errors.Is(err, guests.ErrUnauthorized):
			server.WriteError(w, http.StatusUnauthorized, "unauthorized", "Guest token is invalid.")
		case errors.Is(err, ErrForbidden):
			server.WriteError(w, http.StatusForbidden, "forbidden", "Photo does not belong to this guest session.")
		case errors.Is(err, ErrNotFound):
			server.WriteError(w, http.StatusNotFound, "not_found", "Photo was not found.")
		default:
			server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load photo status.")
		}
		return
	}

	server.WriteJSON(w, http.StatusOK, response)
}
