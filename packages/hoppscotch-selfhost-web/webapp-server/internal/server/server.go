// Package server handles HTTP endpoints for bundle distribution.
//
// Endpoints:
//   GET /health              - health check
//   GET /api/v1/manifest     - bundle metadata (files, hashes, signature)
//   GET /api/v1/bundle       - download the actual ZIP
//   GET /api/v1/key          - public key for signature verification
//
// All endpoints also available under /desktop-app-server/ for backwards compat.

package server

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"hoppscotch-selfhost-web/webapp-server/internal/bundle"
)

type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Code    int         `json:"code"`
}

type Server struct {
	bundleManager *bundle.Manager
}

func New(bundleManager *bundle.Manager) *Server {
	return &Server{
		bundleManager: bundleManager,
	}
}

func (s *Server) HandleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (s *Server) HandleManifest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Fetching bundle manifest")

	b := s.bundleManager.GetBundle()

	response := Response{
		Success: true,
		Data:    b.Metadata,
		Code:    http.StatusOK,
	}

	s.writeJSONResponse(w, response, http.StatusOK)
}

func (s *Server) HandleDownloadBundle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Starting bundle download")

	b := s.bundleManager.GetBundle()

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(b.Content)))
	w.Header().Set("Content-Disposition", "attachment; filename=\"bundle.zip\"")

	if _, err := w.Write(b.Content); err != nil {
		log.Printf("Error writing bundle response: %v", err)
		return
	}

	log.Printf("Successfully sent bundle for download (size: %d bytes)", len(b.Content))
}

func (s *Server) HandleKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Listing public key")

	keyInfo := map[string]string{
		"key": base64.StdEncoding.EncodeToString(s.bundleManager.GetVerifyingKey()),
	}

	response := Response{
		Success: true,
		Data:    keyInfo,
		Code:    http.StatusOK,
	}

	s.writeJSONResponse(w, response, http.StatusOK)
}

// writeJSONResponse buffers the response first to avoid partial writes on error
func (s *Server) writeJSONResponse(w http.ResponseWriter, response Response, statusCode int) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(response); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if _, err := w.Write(buf.Bytes()); err != nil {
		log.Printf("Error writing response: %v", err)
	}
}

func (s *Server) writeErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	response := Response{
		Success: false,
		Error:   message,
		Code:    statusCode,
	}
	s.writeJSONResponse(w, response, statusCode)
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", s.HandleHealth)
	mux.HandleFunc("/api/v1/manifest", s.HandleManifest)
	mux.HandleFunc("/api/v1/bundle", s.HandleDownloadBundle)
	mux.HandleFunc("/api/v1/key", s.HandleKey)

	// desktop app backwards compat
	mux.HandleFunc("/desktop-app-server/api/v1/manifest", s.HandleManifest)
	mux.HandleFunc("/desktop-app-server/api/v1/bundle", s.HandleDownloadBundle)
	mux.HandleFunc("/desktop-app-server/api/v1/key", s.HandleKey)
}
