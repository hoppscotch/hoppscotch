// Package crypto handles ed25519 key generation and persistence.
//
// Key sources (in priority order):
//  1. WEBAPP_SERVER_SIGNING_KEY: full 64-byte private key, base64
//  2. WEBAPP_SERVER_SIGNING_SEED: 32-byte seed, base64
//  3. WEBAPP_SERVER_SIGNING_SECRET: any string (SHA-256 derived)
//  4. Key file on disk
//  5. Generate new and try to persist
//
// For production, either mount a volume at /data/webapp-server
// or set one of the WEBAPP_SERVER_SIGNING_* env vars.

package crypto

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

const (
	DefaultKeyFileName = "signing.key"
	DefaultKeyDir      = "/data/webapp-server"
	DevKeyDir          = ".webapp-server"
)

type KeyPair struct {
	SigningKey   ed25519.PrivateKey
	VerifyingKey ed25519.PublicKey
}

// GenerateKeyPair gets or creates an ed25519 key pair.
// Tries env vars first, then disk, then generates new.
func GenerateKeyPair() (*KeyPair, error) {
	// try env vars first (explicit config always wins)
	if keyB64 := os.Getenv("WEBAPP_SERVER_SIGNING_KEY"); keyB64 != "" {
		return loadFromBase64Key(keyB64)
	}

	if seedB64 := os.Getenv("WEBAPP_SERVER_SIGNING_SEED"); seedB64 != "" {
		return loadFromBase64Seed(seedB64)
	}

	if secret := os.Getenv("WEBAPP_SERVER_SIGNING_SECRET"); secret != "" {
		return deriveFromSecret(secret)
	}

	// try loading from disk
	keyPath := getKeyFilePath()
	if kp, err := loadFromFile(keyPath); err == nil {
		return kp, nil
	}

	// nothing found, generate fresh and try to persist
	return generateAndPersist(keyPath)
}

func getKeyFilePath() string {
	if path := os.Getenv("WEBAPP_SERVER_SIGNING_KEY_FILE"); path != "" {
		return path
	}

	var keyDir string
	if isDevMode() {
		keyDir = DevKeyDir
	} else {
		keyDir = DefaultKeyDir
	}

	return filepath.Join(keyDir, DefaultKeyFileName)
}

func loadFromFile(path string) (*KeyPair, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	keyBytes, err := base64.StdEncoding.DecodeString(string(data))
	if err != nil {
		return nil, fmt.Errorf("invalid key file format: %w", err)
	}

	if len(keyBytes) != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("invalid key length in file: expected %d, got %d", ed25519.PrivateKeySize, len(keyBytes))
	}

	priv := ed25519.PrivateKey(keyBytes)
	pub := priv.Public().(ed25519.PublicKey)

	log.Printf("Loaded signing key from file: %s", path)
	log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))

	return &KeyPair{
		SigningKey:   priv,
		VerifyingKey: pub,
	}, nil
}

func saveToFile(path string, priv ed25519.PrivateKey) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create key directory: %w", err)
	}

	encoded := base64.StdEncoding.EncodeToString(priv)
	if err := os.WriteFile(path, []byte(encoded), 0600); err != nil {
		return fmt.Errorf("failed to write key file: %w", err)
	}

	return nil
}

// generateAndPersist creates a new key and tries to save it.
// If we can't persist, we log the key so operators can set it manually.
func generateAndPersist(keyPath string) (*KeyPair, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate key pair: %w", err)
	}

	kp := &KeyPair{
		SigningKey:   priv,
		VerifyingKey: pub,
	}

	if err := saveToFile(keyPath, priv); err == nil {
		log.Printf("Generated and saved signing key to: %s", keyPath)
		log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))
		return kp, nil
	}

	// couldn't persist, log the key so it can be set via env var
	// this is annoying but better than silent failures
	keyB64 := base64.StdEncoding.EncodeToString(priv)

	log.Println("========================================")
	log.Println("SIGNING KEY PERSISTENCE FAILED")
	log.Println("========================================")
	log.Printf("Could not save signing key to: %s", keyPath)
	log.Println("")
	log.Println("This key will be lost on restart, causing")
	log.Println("'Invalid signature' errors for users with")
	log.Println("cached bundles.")
	log.Println("")
	log.Println("To persist this key, set this environment variable:")
	log.Println("")
	log.Printf("  WEBAPP_SERVER_SIGNING_KEY=%s", keyB64)
	log.Println("")
	log.Println("Or mount a persistent volume at:")
	log.Printf("  %s", filepath.Dir(keyPath))
	log.Println("========================================")

	log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))

	return kp, nil
}

func loadFromBase64Key(keyB64 string) (*KeyPair, error) {
	keyBytes, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil {
		return nil, fmt.Errorf("invalid WEBAPP_SERVER_SIGNING_KEY: %w", err)
	}

	if len(keyBytes) != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("WEBAPP_SERVER_SIGNING_KEY must be %d bytes, got %d", ed25519.PrivateKeySize, len(keyBytes))
	}

	priv := ed25519.PrivateKey(keyBytes)
	pub := priv.Public().(ed25519.PublicKey)

	log.Printf("Loaded signing key from WEBAPP_SERVER_SIGNING_KEY")
	log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))

	return &KeyPair{
		SigningKey:   priv,
		VerifyingKey: pub,
	}, nil
}

func loadFromBase64Seed(seedB64 string) (*KeyPair, error) {
	seedBytes, err := base64.StdEncoding.DecodeString(seedB64)
	if err != nil {
		return nil, fmt.Errorf("invalid WEBAPP_SERVER_SIGNING_SEED: %w", err)
	}

	if len(seedBytes) != ed25519.SeedSize {
		return nil, fmt.Errorf("WEBAPP_SERVER_SIGNING_SEED must be %d bytes, got %d", ed25519.SeedSize, len(seedBytes))
	}

	priv := ed25519.NewKeyFromSeed(seedBytes)
	pub := priv.Public().(ed25519.PublicKey)

	log.Printf("Derived signing key from WEBAPP_SERVER_SIGNING_SEED")
	log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))

	return &KeyPair{
		SigningKey:   priv,
		VerifyingKey: pub,
	}, nil
}

// deriveFromSecret hashes an arbitrary string to get a seed.
// Simple but works for shared secrets across replicas.
func deriveFromSecret(secret string) (*KeyPair, error) {
	hash := sha256.Sum256([]byte(secret))
	priv := ed25519.NewKeyFromSeed(hash[:])
	pub := priv.Public().(ed25519.PublicKey)

	log.Printf("Derived signing key from WEBAPP_SERVER_SIGNING_SECRET")
	log.Printf("Verifying key: %s", base64.StdEncoding.EncodeToString(pub))

	return &KeyPair{
		SigningKey:   priv,
		VerifyingKey: pub,
	}, nil
}

// isDevMode returns true if GO_ENV=development.
func isDevMode() bool {
	return os.Getenv("GO_ENV") == "development"
}
