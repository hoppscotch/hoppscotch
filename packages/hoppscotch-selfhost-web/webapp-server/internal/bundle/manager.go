package bundle

import (
	"archive/zip"
	"bytes"
	"crypto/ed25519"
	"encoding/base64"
	"fmt"
	"log"
	"sync"
	"time"
)

// Manager holds the bundle in memory and handles signing.
// Thread-safe for concurrent reads (writes only happen at startup).
type Manager struct {
	mu           sync.RWMutex
	bundle       *Bundle
	maxSize      int
	signingKey   ed25519.PrivateKey
	verifyingKey ed25519.PublicKey
}

// NewManager creates a manager with a pre-built bundle.
// Signs the bundle content immediately so it's ready to serve.
func NewManager(
	content []byte,
	files []FileEntry,
	signingKey ed25519.PrivateKey,
	verifyingKey ed25519.PublicKey,
	maxSize int,
) (*Manager, error) {
	if len(content) > maxSize {
		return nil, fmt.Errorf("bundle too large: %d bytes (max: %d)", len(content), maxSize)
	}

	// sanity check that we actually have a valid zip
	if _, err := zip.NewReader(bytes.NewReader(content), int64(len(content))); err != nil {
		return nil, fmt.Errorf("invalid zip archive: %w", err)
	}

	// sign the raw bytes, clients will verify against this
	signature := ed25519.Sign(signingKey, content)

	bundle := &Bundle{
		Metadata: Metadata{
			Version:   Version,
			CreatedAt: time.Now().UTC(),
			Signature: base64.StdEncoding.EncodeToString(signature),
			Manifest:  Manifest{Files: files},
		},
		Content: content,
	}

	log.Println("Bundle signed and stored successfully")

	return &Manager{
		bundle:       bundle,
		maxSize:      maxSize,
		signingKey:   signingKey,
		verifyingKey: verifyingKey,
	}, nil
}

func (m *Manager) GetBundle() *Bundle {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.bundle
}

func (m *Manager) GetVerifyingKey() ed25519.PublicKey {
	return m.verifyingKey
}
