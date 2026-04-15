package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

const (
	DefaultPort         = 3200
	DefaultFrontendPath = "/site/selfhost-web"
	DevFrontendPath     = "../dist"

	DefaultReadTimeout  = 15 * time.Second
	DefaultWriteTimeout = 15 * time.Second
	DefaultIdleTimeout  = 60 * time.Second
)

type Config struct {
	Port         int
	FrontendPath string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// parseDuration reads a duration in seconds from an env var.
// If the variable is unset or invalid, it logs a warning and returns the fallback.
func parseDuration(envKey string, fallback time.Duration) time.Duration {
	if s := os.Getenv(envKey); s != "" {
		if secs, err := strconv.Atoi(s); err == nil && secs > 0 {
			d := time.Duration(secs) * time.Second
			log.Printf("Using %s from environment: %ds", envKey, secs)
			return d
		}
		log.Printf("Warning: Invalid %s value '%s', using default %v", envKey, s, fallback)
	}
	return fallback
}

// Load reads config from env vars with sensible defaults
func Load() *Config {
	cfg := &Config{
		Port:         DefaultPort,
		ReadTimeout:  DefaultReadTimeout,
		WriteTimeout: DefaultWriteTimeout,
		IdleTimeout:  DefaultIdleTimeout,
	}

	if portStr := os.Getenv("WEBAPP_SERVER_PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil {
			cfg.Port = port
			log.Printf("Using WEBAPP_SERVER_PORT from environment: %d", port)
		} else {
			log.Printf("Warning: Invalid WEBAPP_SERVER_PORT value '%s', using default %d", portStr, DefaultPort)
		}
	} else {
		log.Printf("Using default port: %d", DefaultPort)
	}

	// NOTE: env var takes priority, then we check GO_ENV for dev mode
	if frontendPath := os.Getenv("FRONTEND_PATH"); frontendPath != "" {
		cfg.FrontendPath = frontendPath
		log.Printf("Using FRONTEND_PATH from environment: %s", frontendPath)
	} else if os.Getenv("GO_ENV") == "development" {
		cfg.FrontendPath = DevFrontendPath
		log.Println("Running in development mode, using frontend path: ../dist")
	} else {
		cfg.FrontendPath = DefaultFrontendPath
		log.Println("Running in production mode, using frontend path: /site/selfhost-web")
	}

	cfg.ReadTimeout = parseDuration("WEBAPP_READ_TIMEOUT", DefaultReadTimeout)
	cfg.WriteTimeout = parseDuration("WEBAPP_WRITE_TIMEOUT", DefaultWriteTimeout)
	cfg.IdleTimeout = parseDuration("WEBAPP_IDLE_TIMEOUT", DefaultIdleTimeout)

	return cfg
}
