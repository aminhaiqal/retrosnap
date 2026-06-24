package album

import (
	"errors"
	"net/http"
	"time"

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
	r.Get("/events/{eventId}/album", h.GetAlbum)
}

func (h *Handler) GetAlbum(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetAlbum(r.Context(), chi.URLParam(r, "eventId"), time.Now())
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			server.WriteError(w, http.StatusNotFound, "not_found", "Event was not found.")
			return
		}
		server.WriteError(w, http.StatusInternalServerError, "internal_error", "Could not load album.")
		return
	}

	server.WriteJSON(w, http.StatusOK, response)
}
