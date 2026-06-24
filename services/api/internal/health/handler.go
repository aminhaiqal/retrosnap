package health

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"retrosnap/services/api/internal/server"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/healthz", h.Healthz)
}

func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	server.WriteJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "retrosnap-api",
	})
}
