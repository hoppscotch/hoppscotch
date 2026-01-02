# Hoppscotch Webapp Server (Go)

Static web server for Hoppscotch Webapp with content bundling (zstd + zip) and verification (blake3 + ed25519).

## Quick Start

```bash
go build -o webapp-server .
GO_ENV=development ./webapp-server
```

or with Docker
```bash
docker build -t hoppscotch-webapp-server .
```

## Configuration

| Variable                         | Description                        | Default                                        |
|----------------------------------|------------------------------------|------------------------------------------------|
| `WEBAPP_SERVER_PORT`             | Server port                        | `3200`                                         |
| `FRONTEND_PATH`                  | Path to frontend assets            | `/site/selfhost-web` (prod) or `../dist` (dev) |
| `WEBAPP_SERVER_SIGNING_SECRET`   | Secret string for key derivation   | None                                           |
| `WEBAPP_SERVER_SIGNING_SEED`     | Base64 encoded 32-byte seed        | None                                           |
| `WEBAPP_SERVER_SIGNING_KEY`      | Base64 encoded 64-byte private key | None                                           |
| `WEBAPP_SERVER_SIGNING_KEY_FILE` | Custom path for key file           | `/data/webapp-server/signing.key`              |
| `GO_ENV`                         | Set to `development` for dev mode  | None                                           |

## Signing Key Persistence

The server needs a stable signing key. Without one, users get "Invalid signature" errors when they have cached bundles from a previous server instance. Keys are resolved in order:

1. Environment variable: `WEBAPP_SERVER_SIGNING_KEY`, `WEBAPP_SERVER_SIGNING_SEED`, or `WEBAPP_SERVER_SIGNING_SECRET`
2. Key file on disk at `/data/webapp-server/signing.key`
3. Auto-generate and persist to disk
4. Ephemeral fallback (logs the key for manual config)

For Kubernetes, either mount a persistent volume at `/data/webapp-server` or set `WEBAPP_SERVER_SIGNING_SECRET` to the same value across replicas.

If the server can't persist to disk, it logs the generated key:

```
========================================
SIGNING KEY PERSISTENCE FAILED
========================================
Could not save signing key to: /data/webapp-server/signing.key

To persist this key, set this environment variable:

  WEBAPP_SERVER_SIGNING_KEY=<base64-encoded-key>

Or mount a persistent volume at:
  /data/webapp-server
========================================
```

Copy the logged key value and set it as an environment variable before the next restart.

## API Endpoints

| Endpoint               | Description                                    |
|------------------------|------------------------------------------------|
| `GET /health`          | Health check                                   |
| `GET /api/v1/manifest` | Bundle metadata with file hashes and signature |
| `GET /api/v1/bundle`   | Download signed ZIP bundle                     |
| `GET /api/v1/key`      | Public verification key                        |

All endpoints also available under `/desktop-app-server/` prefix for desktop app compatibility.

## Architecture

```
Frontend files → zstd ZIP → BLAKE3 per file → ED25519 sign → HTTP serve
                                ↓
                          Manifest JSON
                    (paths, sizes, hashes, MIME types)
```

## Bundle Format

| Component      | Method                   |
|----------------|--------------------------|
| Compression    | zstd (ZIP method 93)     |
| File hashing   | BLAKE3 (base64)          |
| Bundle signing | ED25519 over ZIP content |

## Troubleshooting

"Invalid signature" after restart: Server generated a new key because persistence wasn't configured. Mount a volume at `/data/webapp-server` or set `WEBAPP_SERVER_SIGNING_SECRET`.

"Invalid signature" with multiple replicas: Each replica has a different key. Use env var config with the same secret across all replicas.

Key file permission errors: Container can't write to `/data/webapp-server`. Make it writable or use env var config.

## Development

```bash
GO_ENV=development go run .
go test ./...
CGO_ENABLED=0 GOOS=linux go build -o webapp-server .
```

## Migration from Rust Version

Full API and bundle format compatibility with the Rust version. Same ZIP structure, same BLAKE3 hashing, same ED25519 signatures, identical API responses. New feature is automatic signing key persistence.
