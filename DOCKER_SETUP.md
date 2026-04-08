# Docker Setup Guide

This guide walks you through setting up and running Hoppscotch using Docker. Hoppscotch provides a flexible Docker Compose configuration with multiple deployment profiles to suit different use cases.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed (version 20.10 or later)
- [Docker Compose](https://docs.docker.com/compose/install/) installed (v2 recommended)
- Git

## Quick Start (Recommended)

The fastest way to get Hoppscotch running is with the **default** profile, which starts the all-in-one (AIO) service along with a PostgreSQL database and automatic migrations.

### Step 1: Clone the Repository

```bash
git clone https://github.com/hoppscotch/hoppscotch.git
cd hoppscotch
```

### Step 2: Configure Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Edit the `.env` file to configure the following key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:testpass@hoppscotch-db:5432/hoppscotch` |
| `DATA_ENCRYPTION_KEY` | 32-character encryption key for sensitive data | Must be set |
| `VITE_BASE_URL` | Base URL for the main app | `http://localhost:3000` |
| `VITE_ADMIN_URL` | Base URL for the admin dashboard | `http://localhost:3100` |
| `VITE_BACKEND_GQL_URL` | Backend GraphQL endpoint | `http://localhost:3170/graphql` |
| `VITE_BACKEND_WS_URL` | Backend WebSocket endpoint | `ws://localhost:3170/graphql` |
| `VITE_BACKEND_API_URL` | Backend REST API endpoint | `http://localhost:3170/v1` |

> [!IMPORTANT]
> Change the default `POSTGRES_PASSWORD` (set in `docker-compose.yml`) and `DATABASE_URL` password before deploying to production.

### Step 3: Build and Start

```bash
docker compose --profile default up -d
```

This builds the images and starts all services. The first build may take several minutes.

### Step 4: Access the Application

Once running, the services are available at:

| Service | URL |
|---------|-----|
| Main App | http://localhost:3000 |
| Admin Dashboard | http://localhost:3100 |
| Backend API | http://localhost:3170 |
| Bundle Server | http://localhost:3200 |

## Deployment Profiles

Hoppscotch uses Docker Compose profiles to manage different deployment scenarios. Choose the profile that best fits your needs:

### Default (All-in-One + Database)

```bash
docker compose --profile default up -d
```

Starts the AIO container, PostgreSQL database, and auto-migration service. **Recommended for most users.**

### Default without Database

```bash
docker compose --profile default-no-db up -d
```

Starts only the AIO container. Use this when you have an external PostgreSQL database. Update `DATABASE_URL` in your `.env` file to point to your external database.

> [!NOTE]
> This profile does **not** run `hoppscotch-migrate` automatically. Run migrations manually before starting:
> ```bash
> docker compose run --rm --no-deps hoppscotch-migrate
> ```

### Individual Services

Run specific components separately:

```bash
# Backend API + database + migrations
docker compose --profile backend up -d

# Main app, webapp server, backend, database + migrations
docker compose --profile app up -d

# Admin dashboard, backend, database + migrations
docker compose --profile admin up -d

# Database only
docker compose --profile database up -d
```

### Development

```bash
docker compose --profile just-backend up -d
```

Starts the backend API, database, and migrations. Useful when developing the frontend and admin dashboard locally.

> [!NOTE]
> The `default` and `default-no-db` profiles should not be mixed with individual service profiles, as they will conflict on ports.

## Ports Reference

| Port | Service |
|------|---------|
| 3000 | Main Hoppscotch App |
| 3080 | Caddy HTTP (web server / AIO) |
| 3100 | Admin Dashboard |
| 3170 | Backend API |
| 3180 | Backend Caddy HTTP |
| 3200 | Bundle/Webapp Server |
| 3280 | Admin Dashboard Caddy HTTP |
| 5432 | PostgreSQL Database |

## Common Operations

### Viewing Logs

```bash
# All services
docker compose --profile default logs -f

# Specific service
docker compose --profile default logs -f hoppscotch-aio
```

### Stopping Services

```bash
docker compose --profile default down
```

### Rebuilding After Code Changes

```bash
docker compose --profile default up -d --build
```

### Running Database Migrations Manually

```bash
docker compose --profile default run --rm hoppscotch-migrate
```

## Subpath-Based Access

To serve all services under subpaths from a single port (instead of multiple ports), set the following in your `.env` file:

```
ENABLE_SUBPATH_BASED_ACCESS=true
```

With this setting enabled, access Hoppscotch through the single Caddy endpoint at `http://localhost:3080`. Caddy listens on port 80 inside the container, mapped to host port `3080` in `docker-compose.yml`.

This differs from the default multiport setup where services are exposed on separate ports (3000, 3100, 3170). This uses the `aio-subpath-access.Caddyfile` configuration.

## Troubleshooting

### Database Connection Errors

If services fail to start with database connection errors:

1. Ensure the PostgreSQL container is healthy: `docker compose --profile database ps`
2. Check that `DATABASE_URL` in `.env` matches the database credentials in `docker-compose.yml`
3. The database health check retries for up to 50 seconds — wait for it to become healthy

### Build Failures

- Ensure you have enough disk space (the build requires several GB)
- Increase Docker's memory allocation if builds fail with out-of-memory errors
- Run `docker system prune` to free up space if needed

### Port Conflicts

If ports are already in use, either stop the conflicting services or modify the port mappings in `docker-compose.yml`. The left side of the port mapping (e.g., `3000:3000`) is the host port and can be changed.
