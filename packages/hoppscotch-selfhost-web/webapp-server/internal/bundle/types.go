package bundle

import "time"

const (
	Version = "2025.12.1"

	DefaultMaxSize = 50 * 1024 * 1024

	// zstd compression method for ZIP
	// see: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
	ZipMethodZstd = 93
)

type FileEntry struct {
	Path     string  `json:"path"`
	Size     int64   `json:"size"`
	Hash     string  `json:"hash"`      // blake3, base64 encoded
	MimeType *string `json:"mime_type"` // nil if unknown
}

type Manifest struct {
	Files []FileEntry `json:"files"`
}

type Metadata struct {
	Version   string    `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	Signature string    `json:"signature"` // ed25519 over Content, base64 encoded
	Manifest  Manifest  `json:"manifest"`
}

type Bundle struct {
	Metadata Metadata
	Content  []byte // raw ZIP bytes
}
