# Base Go builder with Go lang installation
# This stage is used to build both Caddy and the webapp server,
# preventing vulnerable packages on the dependency chain
FROM alpine:3.23.4 AS go_builder
RUN apk add --no-cache curl git openssh-client

ARG TARGETARCH
ENV GOLANG_VERSION=1.26.2
# Download Go tarball
RUN case "${TARGETARCH}" in amd64) GOARCH=amd64 ;; arm64) GOARCH=arm64 ;; *) echo "Unsupported arch: ${TARGETARCH}" && exit 1 ;; esac && \
  curl -fsSL "https://go.dev/dl/go${GOLANG_VERSION}.linux-${GOARCH}.tar.gz" -o go.tar.gz
# Checksum verification of Go tarball
RUN case "${TARGETARCH}" in \
  amd64) expected="990e6b4bbba816dc3ee129eaeaf4b42f17c2800b88a2166c265ac1a200262282" ;; \
  arm64) expected="c958a1fe1b361391db163a485e21f5f228142d6f8b584f6bef89b26f66dc5b23" ;; \
  esac && \
  actual=$(sha256sum go.tar.gz | cut -d' ' -f1) && \
  [ "$actual" = "$expected" ] && \
  echo "✅ Go Tarball Checksum OK" || \
  (echo "❌ Go Tarball Checksum failed! Expected: ${expected} Got: ${actual}" && exit 1)
# Install Go from verified tarball
RUN tar -C /usr/local -xzf go.tar.gz && rm go.tar.gz
# Set up Go environment variables
ENV PATH="/usr/local/go/bin:${PATH}" \
  GOPATH="/go" \
  GOBIN="/go/bin"



# Build Caddy from the Go base
FROM go_builder AS caddy_builder
RUN mkdir -p /tmp/caddy-build && \
  curl -L -o /tmp/caddy-build/src.tar.gz https://github.com/caddyserver/caddy/releases/download/v2.11.2/caddy_2.11.2_src.tar.gz
# Checksum verification of caddy source
RUN expected="40cb9dc5e0b005bba635e830ba2354450248831fca3b58f5c49892a4747d0e76" && \
  actual=$(sha256sum /tmp/caddy-build/src.tar.gz | cut -d' ' -f1) && \
  [ "$actual" = "$expected" ] && \
  echo "✅ Caddy Source Checksum OK" || \
  (echo "❌ Caddy Source Checksum failed!" && exit 1)
WORKDIR /tmp/caddy-build
RUN tar -xzf /tmp/caddy-build/src.tar.gz && \
  # Fix CVE-2026-33186: upgrade google.golang.org/grpc to 1.79.3 (CRITICAL - gRPC-Go authorization bypass)
  go get google.golang.org/grpc@v1.79.3 && \
  # Fix CVE-2026-30836 + CVE-2026-40097: upgrade github.com/smallstep/certificates to 0.30.0 (CRITICAL - unauthenticated cert issuance via SCEP)
  go get github.com/smallstep/certificates@v0.30.0 && \
  # Fix CVE-2026-33816 + GHSA-j88v-2chj-qfwx: upgrade github.com/jackc/pgx/v5 to 5.9.2 (CRITICAL - memory-safety + SQL injection)
  go get github.com/jackc/pgx/v5@v5.9.2 && \
  # Fix CVE-2026-34986: upgrade go-jose v3 and v4 (HIGH - DoS via crafted JWE)
  go get github.com/go-jose/go-jose/v3@v3.0.5 && \
  go get github.com/go-jose/go-jose/v4@v4.1.4 && \
  # Fix CVE-2026-39883: upgrade go.opentelemetry.io/otel/sdk to 1.43.0 (HIGH - PATH hijacking)
  go get go.opentelemetry.io/otel/sdk@v1.43.0 && \
  # Fix CVE-2026-39882: upgrade OpenTelemetry OTLP exporters (MEDIUM)
  go get go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp@v0.19.0 && \
  go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp@v1.43.0 && \
  go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp@v1.43.0 && \
  # Clean up any existing vendor directory and regenerate with updated deps
  rm -rf vendor && \
  go mod tidy && \
  go mod vendor
WORKDIR /tmp/caddy-build/cmd/caddy
RUN go build



# Build webapp server from the Go base
# This reuses the Go installation from go_builder, avoiding a separate image pull
# and significantly reducing build time (especially on ARM64 in CI)
FROM go_builder AS webapp_server_builder
WORKDIR /usr/src/app
COPY . .
WORKDIR /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o webapp-server .



# Shared Node.js base with optimized NPM installation
FROM alpine:3.23.4 AS node_base
# Install dependencies
RUN apk upgrade --no-cache && \
  apk add --no-cache nodejs curl bash tini ca-certificates
# Set working directory for NPM installation
RUN mkdir -p /tmp/npm-install
WORKDIR /tmp/npm-install
# Download NPM tarball
RUN curl -fsSL https://registry.npmjs.org/npm/-/npm-11.13.0.tgz -o npm.tgz
# Verify checksum
RUN expected="a4ffa1de3bf1c7f9d5e3dd24fe2921970bdb1589d647f4083eaaaab3be974b7e" \
  && actual=$(sha256sum npm.tgz | cut -d' ' -f1) \
  && [ "$actual" = "$expected" ] \
  && echo "✅ NPM Tarball Checksum OK" \
  || (echo "❌ NPM Tarball Checksum failed!" && exit 1)
# Install NPM from verified tarball and global packages
RUN tar -xzf npm.tgz && \
  cd package && \
  node bin/npm-cli.js install -g npm@11.13.0 && \
  cd / && \
  rm -rf /tmp/npm-install
RUN npm install -g pnpm@10.33.2 @import-meta-env/cli@0.7.4

# Fix CVE-2025-64756 by replacing vulnerable glob in @import-meta-env/cli (ships glob@11.0.2, fix requires >=11.1.0)
RUN mkdir -p /tmp/glob-fix && \
  cd /tmp/glob-fix && \
  npm install glob@11.1.0 && \
  rm -rf /usr/lib/node_modules/@import-meta-env/cli/node_modules/glob && \
  cp -r node_modules/glob /usr/lib/node_modules/@import-meta-env/cli/node_modules/ && \
  rm -rf /tmp/glob-fix

# Fix CVE: upgrade serialize-javascript in @import-meta-env/cli (ships 6.0.2, fix requires >=7.0.3)
RUN mkdir -p /tmp/serialize-fix && \
  cd /tmp/serialize-fix && \
  npm install serialize-javascript@7.0.3 && \
  rm -rf /usr/lib/node_modules/@import-meta-env/cli/node_modules/serialize-javascript && \
  cp -r node_modules/serialize-javascript /usr/lib/node_modules/@import-meta-env/cli/node_modules/ && \
  rm -rf /tmp/serialize-fix



FROM node_base AS base_builder
# Required by @hoppscotch/js-sandbox to build `isolated-vm`
RUN apk add --no-cache python3 make g++ git openssh-client zlib-dev brotli-dev c-ares-dev nghttp2-dev openssl-dev icu-dev ada-dev simdjson-dev simdutf-dev sqlite-dev zstd-dev

WORKDIR /usr/src/app
ENV HOPP_ALLOW_RUNTIME_ENV=true
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY pnpm-lock.yaml .
RUN pnpm fetch

COPY . .
RUN pnpm install -f --prefer-offline



FROM base_builder AS backend_builder
WORKDIR /usr/src/app/packages/hoppscotch-backend
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
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



FROM node_base AS app
# Install caddy
COPY --from=caddy_builder /tmp/caddy-build/cmd/caddy/caddy /usr/bin/caddy

# Copy over webapp server bin
COPY --from=webapp_server_builder /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server/webapp-server /usr/local/bin/

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
COPY --from=webapp_server_builder /usr/src/app/packages/hoppscotch-selfhost-web/webapp-server/webapp-server /usr/local/bin/
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
HEALTHCHECK --interval=2s --start-period=15s CMD /bin/sh /healthcheck.sh

WORKDIR /dist/backend
CMD ["node", "/usr/src/app/aio_run.mjs"]

# NOTE: Although these ports are exposed, the HOPP_ALTERNATE_AIO_PORT variable can be used to assign a user-specified port
EXPOSE 3170
EXPOSE 3000
EXPOSE 3100
EXPOSE 3200
EXPOSE 80
