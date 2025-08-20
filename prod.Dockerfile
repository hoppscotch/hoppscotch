# This step is used to build a custom build of Caddy to prevent
# vulnerable packages on the dependency chain
FROM alpine:3.22.1 AS caddy_builder
RUN apk add --no-cache curl git && \
  mkdir -p /tmp/caddy-build && \
  curl -L -o /tmp/caddy-build/src.tar.gz https://github.com/caddyserver/caddy/releases/download/v2.10.0/caddy_2.10.0_src.tar.gz

# Checksum verification of caddy source
RUN expected="62ba008d9e9fd354e8b28be11de59c6a213f9153f2e9de451417c0b4eb13d9f3" && \
  actual=$(sha256sum /tmp/caddy-build/src.tar.gz | cut -d' ' -f1) && \
  [ "$actual" = "$expected" ] && \
  echo "✅ Caddy Source Checksum OK" || \
  (echo "❌ Caddy Source Checksum failed!" && exit 1)

# Install Go 1.25.0 from GitHub releases to fix CVE-2025-47907
ARG TARGETARCH
ENV GOLANG_VERSION=1.25.0
# Download and install Go from the official tarball
RUN case "${TARGETARCH}" in amd64) GOARCH=amd64 ;; arm64) GOARCH=arm64 ;; *) echo "Unsupported arch: ${TARGETARCH}" && exit 1 ;; esac && \
  curl -fsSL "https://go.dev/dl/go${GOLANG_VERSION}.linux-${GOARCH}.tar.gz" -o go.tar.gz && \
  tar -C /usr/local -xzf go.tar.gz && \
  rm go.tar.gz
# Set up Go environment variables
ENV PATH="/usr/local/go/bin:${PATH}" \
  GOPATH="/go" \
  GOBIN="/go/bin"

WORKDIR /tmp/caddy-build
RUN tar xvf /tmp/caddy-build/src.tar.gz && \
  # Patch to resolve GHSA-vrw8-fxc6-2r93 on chi
  go get github.com/go-chi/chi/v5@v5.2.2 && \
  # Patch to resolve GHSA-2x5j-vhc8-9cwm on circl
  go get github.com/cloudflare/circl@v1.6.1 && \
  # Clean up any existing vendor directory and regenerate with updated deps
  rm -rf vendor && \
  go mod tidy && \
  go mod vendor

WORKDIR /tmp/caddy-build/cmd/caddy
# Build using the updated vendored dependencies
RUN go build



# Shared Node.js base with optimized NPM installation
FROM alpine:3.22.1 AS node_base
RUN apk add --no-cache nodejs curl tini && \
  # Install NPM from source, as Alpine version is old and has dependency vulnerabilities
  # TODO: Find a better method which is resistant to supply chain attacks
  sh -c "curl -qL https://www.npmjs.com/install.sh | env npm_install=11.5.2 sh" && \
  npm install -g pnpm@10.15.0 @import-meta-env/cli



FROM node_base AS base_builder
# Required by @hoppscotch/js-sandbox to build `isolated-vm`
RUN apk add --no-cache python3 make g++ zlib-dev brotli-dev c-ares-dev nghttp2-dev openssl-dev icu-dev ada-dev simdjson-dev simdutf-dev sqlite-dev zstd-dev

WORKDIR /usr/src/app
ENV HOPP_ALLOW_RUNTIME_ENV=true

COPY pnpm-lock.yaml .
RUN pnpm fetch

COPY . .
RUN pnpm install -f --prefer-offline



FROM base_builder AS backend_builder
WORKDIR /usr/src/app/packages/hoppscotch-backend
RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm --filter=hoppscotch-backend deploy /dist/backend --prod --legacy
WORKDIR /dist/backend
RUN pnpm exec prisma generate

FROM node_base AS backend
# Install caddy
COPY --from=caddy_builder /tmp/caddy-build/cmd/caddy/caddy /usr/bin/caddy
COPY --from=base_builder  /usr/src/app/packages/hoppscotch-backend/backend.Caddyfile /etc/caddy/backend.Caddyfile
COPY --from=backend_builder /dist/backend /dist/backend
COPY --from=base_builder /usr/src/app/packages/hoppscotch-backend/prod_run.mjs /dist/backend

# Remove the env file to avoid backend copying it in and using it
ENV PRODUCTION="true"
ENV PORT=8080

WORKDIR /dist/backend

CMD ["node", "prod_run.mjs"]
EXPOSE 80
EXPOSE 3170



FROM base_builder AS fe_builder
WORKDIR /usr/src/app/packages/hoppscotch-selfhost-web
RUN pnpm run generate

FROM rust:1-alpine AS webapp_server_builder
WORKDIR /usr/src/app
RUN apk add --no-cache musl-dev
COPY . .
WORKDIR /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server
RUN cargo build --release



FROM node_base AS app
# Install caddy
COPY --from=caddy_builder /tmp/caddy-build/cmd/caddy/caddy /usr/bin/caddy

# Copy over webapp server bin
COPY --from=webapp_server_builder /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server/target/release/webapp-server /usr/local/bin/

COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/prod_run.mjs /site/prod_run.mjs
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/selfhost-web.Caddyfile /etc/caddy/selfhost-web.Caddyfile
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist/ /site/selfhost-web

WORKDIR /site
# Run both webapp-server and Caddy after env processing (NOTE: env processing is required by both)
CMD ["/bin/sh", "-c", "node /site/prod_run.mjs && (webapp-server & caddy run --config /etc/caddy/selfhost-web.Caddyfile --adapter caddyfile)"]

EXPOSE 80
EXPOSE 3000
EXPOSE 3200



FROM base_builder AS sh_admin_builder
WORKDIR /usr/src/app/packages/hoppscotch-sh-admin
# Generate two builds for `sh-admin`, one based on subpath-access and the regular build
RUN pnpm run build --outDir dist-multiport-setup
RUN pnpm run build --outDir dist-subpath-access --base /admin/


FROM node_base AS sh_admin
# Install caddy
COPY --from=caddy_builder /tmp/caddy-build/cmd/caddy/caddy /usr/bin/caddy

COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/prod_run.mjs /site/prod_run.mjs
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/sh-admin-multiport-setup.Caddyfile /etc/caddy/sh-admin-multiport-setup.Caddyfile
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/sh-admin-subpath-access.Caddyfile /etc/caddy/sh-admin-subpath-access.Caddyfile
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist-multiport-setup /site/sh-admin-multiport-setup
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist-subpath-access /site/sh-admin-subpath-access

WORKDIR /site
CMD ["node","/site/prod_run.mjs"]

EXPOSE 80
EXPOSE 3100



FROM node_base AS aio

# Caddy install
COPY --from=caddy_builder /tmp/caddy-build/cmd/caddy/caddy /usr/bin/caddy

ENV PRODUCTION="true"
ENV PORT=8080

# Open Containers Initiative (OCI) labels - useful for bots like Renovate
LABEL org.opencontainers.image.source="https://github.com/hoppscotch/hoppscotch" \
  org.opencontainers.image.url="https://docs.hoppscotch.io" \
  org.opencontainers.image.licenses="MIT"

# Copy necessary files
# Backend files
COPY --from=base_builder /usr/src/app/packages/hoppscotch-backend/backend.Caddyfile /etc/caddy/backend.Caddyfile
COPY --from=backend_builder /dist/backend /dist/backend
COPY --from=base_builder /usr/src/app/packages/hoppscotch-backend/prod_run.mjs /dist/backend

# Static Server
COPY --from=webapp_server_builder /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server/target/release/webapp-server /usr/local/bin/
RUN mkdir -p /site/selfhost-web
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist /site/selfhost-web

# FE Files
COPY --from=base_builder /usr/src/app/aio_run.mjs /usr/src/app/aio_run.mjs
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist /site/selfhost-web
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist-multiport-setup /site/sh-admin-multiport-setup
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist-subpath-access /site/sh-admin-subpath-access
COPY aio-multiport-setup.Caddyfile /etc/caddy/aio-multiport-setup.Caddyfile
COPY aio-subpath-access.Caddyfile /etc/caddy/aio-subpath-access.Caddyfile

ENTRYPOINT [ "tini", "--" ]
COPY --chmod=755 healthcheck.sh /
HEALTHCHECK --interval=2s CMD /bin/sh /healthcheck.sh

WORKDIR /dist/backend
CMD ["node", "/usr/src/app/aio_run.mjs"]

# NOTE: Although these ports are exposed, the HOPP_ALTERNATE_AIO_PORT variable can be used to assign a user-specified port
EXPOSE 3170
EXPOSE 3000
EXPOSE 3100
EXPOSE 3200
EXPOSE 80
