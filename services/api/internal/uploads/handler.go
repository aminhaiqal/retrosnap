package uploads

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
	r.Post("/uploads/presign", h.PresignUpload)
	r.Post("/uploads/confirm", h.ConfirmUpload)
}

func (h *Handler) PresignUpload(w http.ResponseWriter, r *http.Request) {
	token, ok := guests.BearerToken(r.Header.Get("Authorization"))
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "unauthorized", "Guest token is required.")
		return
	}

	var request PresignRequest
	if err := server.DecodeJSON(r, &request); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
		return
	}

	response, err := h.service.PresignUpload(r.Context(), token, request)
	if err != nil {
		writeUploadError(w, err)
		return
	}

	server.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) ConfirmUpload(w http.ResponseWriter, r *http.Request) {
	token, ok := guests.BearerToken(r.Header.Get("Authorization"))
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "unauthorized", "Guest token is required.")
		return
	}

	var request ConfirmRequest
	if err := server.DecodeJSON(r, &request); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
		return
	}

	response, err := h.service.ConfirmUpload(r.Context(), token, request)
	if err != nil {
		writeUploadError(w, err)
		return
	}

	server.WriteJSON(w, http.StatusOK, response)
}

func writeUploadError(w http.ResponseWriter, err error) {
	var uploadError *Error
	if errors.As(err, &uploadError) {
		server.WriteError(w, uploadError.Status, uploadError.Code, uploadError.Message)
		return
	}

	server.WriteError(w, http.StatusInternalServerError, "internal_error", "Upload request failed.")
}
