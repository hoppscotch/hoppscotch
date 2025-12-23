// Package bundle handles creating and managing frontend bundles.
//
// Bundles are zstd-compressed ZIP archives with blake3 hashes per file
// and an ed25519 signature over the whole thing.

package bundle

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/klauspost/compress/zstd"
	"github.com/zeebo/blake3"
)

// Builder walks frontend files and packs them into a signed bundle
type Builder struct{}

func NewBuilder() (*Builder, error) {
	return &Builder{}, nil
}

func init() {
	// zstd is ZIP method 93
	// see: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
	zip.RegisterCompressor(ZipMethodZstd, func(w io.Writer) (io.WriteCloser, error) {
		return zstd.NewWriter(w)
	})

	// register decompressor for ZIP validation in manager.go
	zip.RegisterDecompressor(ZipMethodZstd, func(r io.Reader) io.ReadCloser {
		decoder, err := zstd.NewReader(r)
		if err != nil {
			// return a reader that errors on read
			return errReadCloser{err}
		}
		return decoder.IOReadCloser()
	})
}

// errReadCloser is a ReadCloser that always returns an error on Read.
type errReadCloser struct {
	err error
}

func (e errReadCloser) Read(p []byte) (int, error) {
	return 0, e.err
}

func (e errReadCloser) Close() error {
	return nil
}

// Build walks frontendPath and creates a zstd-compressed ZIP.
// Returns the raw bytes, file metadata, and any error.
//
// NOTE: compression happens at the ZIP level (each file is zstd'd individually),
// matching the Rust implementation's approach. This plays nice with partial
// downloads if we ever want to support range requests.
func (b *Builder) Build(frontendPath string) ([]byte, []FileEntry, error) {
	if _, err := os.Stat(frontendPath); os.IsNotExist(err) {
		return nil, nil, fmt.Errorf("frontend path does not exist: %s", frontendPath)
	}

	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	var files []FileEntry
	var fileCount int

	err := filepath.Walk(frontendPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error accessing %s: %w", path, err)
		}
		if info.IsDir() {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read file %s: %w", path, err)
		}

		relPath, err := filepath.Rel(frontendPath, path)
		if err != nil {
			return fmt.Errorf("failed to compute relative path for %s: %w", path, err)
		}

		// normalize to forward slashes for cross-platform compat
		normalizedPath := filepath.ToSlash(relPath)

		header := &zip.FileHeader{
			Name:   normalizedPath,
			Method: ZipMethodZstd,
		}
		header.SetMode(0644)

		writer, err := zipWriter.CreateHeader(header)
		if err != nil {
			return fmt.Errorf("failed to create ZIP entry for %s: %w", relPath, err)
		}

		if _, err := writer.Write(content); err != nil {
			return fmt.Errorf("failed to write file %s to ZIP: %w", relPath, err)
		}

		// blake3 for file integrity checks
		hasher := blake3.New()
		hasher.Write(content)
		hash := hasher.Sum(nil)

		mimeType := detectMimeType(path)

		files = append(files, FileEntry{
			Path:     normalizedPath,
			Size:     info.Size(),
			Hash:     base64.StdEncoding.EncodeToString(hash),
			MimeType: mimeType,
		})

		fileCount++
		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	if err := zipWriter.Close(); err != nil {
		return nil, nil, fmt.Errorf("failed to finalize ZIP archive: %w", err)
	}

	log.Printf("Built bundle with %d files (%d bytes)", fileCount, buf.Len())
	return buf.Bytes(), files, nil
}

// detectMimeType guesses MIME type from extension.
// Returns nil if unknown (matches Rust's Option<String> behavior).
func detectMimeType(path string) *string {
	ext := filepath.Ext(path)
	if ext == "" {
		return nil
	}

	// try Go's builtin mime registry first
	mimeType := mime.TypeByExtension(ext)
	if mimeType != "" {
		// strip params like "; charset=utf-8"
		if idx := strings.Index(mimeType, ";"); idx != -1 {
			mimeType = strings.TrimSpace(mimeType[:idx])
		}
		return &mimeType
	}

	// handle web-specific types Go doesn't know about
	switch strings.ToLower(ext) {
	case ".wasm":
		m := "application/wasm"
		return &m
	case ".mjs":
		m := "application/javascript"
		return &m
	case ".tsx", ".ts":
		m := "application/typescript"
		return &m
	case ".vue":
		m := "application/vue"
		return &m
	case ".svelte":
		m := "application/svelte"
		return &m
	case ".json5":
		m := "application/json5"
		return &m
	case ".webmanifest":
		m := "application/manifest+json"
		return &m
	}

	return nil
}
