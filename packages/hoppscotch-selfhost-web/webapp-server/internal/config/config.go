package config

import (
	"log"
	"os"
	"strconv"
)

const (
	DefaultPort         = 3200
	DefaultFrontendPath = "/site/selfhost-web"
	DevFrontendPath     = "../dist"
)

type Config struct {
	Port         int
	FrontendPath string
}

// Load reads config from env vars with sensible defaults
func Load() *Config {
	cfg := &Config{
		Port: DefaultPort,
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

	return cfg
}
