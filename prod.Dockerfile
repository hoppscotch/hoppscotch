# This step is used to build a custom build of Caddy to prevent
# vulnerable packages on the dependency chain
FROM alpine:3.22.2 AS caddy_builder
RUN apk add --no-cache curl git && \
  mkdir -p /tmp/caddy-build && \
  curl -L -o /tmp/caddy-build/src.tar.gz https://github.com/caddyserver/caddy/releases/download/v2.10.2/caddy_2.10.2_src.tar.gz

# Checksum verification of caddy source
RUN expected="a9efa00c161922dd24650fd0bee2f4f8bb2fb69ff3e63dcc44f0694da64bb0cf" && \
  actual=$(sha256sum /tmp/caddy-build/src.tar.gz | cut -d' ' -f1) && \
  [ "$actual" = "$expected" ] && \
  echo "✅ Caddy Source Checksum OK" || \
  (echo "❌ Caddy Source Checksum failed!" && exit 1)

# Install Go 1.25.4 from GitHub releases to fix CVE-2025-47907
ARG TARGETARCH
ENV GOLANG_VERSION=1.25.4
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
  # Patch to resolve CVE-2025-59530 on quic-go
  go get github.com/quic-go/quic-go@v0.55.0 && \
  # Patch to resolve CVE-2025-62820 on nebula
  go get github.com/slackhq/nebula@v1.9.7 && \
  # Patch to resolve CVE-2025-47913 on crypto
  go get golang.org/x/crypto@v0.45.0 && \
  # Clean up any existing vendor directory and regenerate with updated deps
  rm -rf vendor && \
  go mod tidy && \
  go mod vendor

WORKDIR /tmp/caddy-build/cmd/caddy
# Build using the updated vendored dependencies
RUN go build



# Shared Node.js base with optimized NPM installation
FROM alpine:3.22.2 AS node_base
# Install dependencies
RUN apk add --no-cache nodejs curl bash tini ca-certificates \
  && mkdir -p /tmp/npm-install
# Set working directory for NPM installation
WORKDIR /tmp/npm-install
# Download NPM tarball
RUN curl -fsSL https://registry.npmjs.org/npm/-/npm-11.6.3.tgz -o npm.tgz
# Verify checksum
RUN expected="f021e628209026669ec9e3881523a7efcf26934fd3fb5dd3fd9aa2a5030c7c41" \
  && actual=$(sha256sum npm.tgz | cut -d' ' -f1) \
  && [ "$actual" = "$expected" ] \
  && echo "✅ NPM Tarball Checksum OK" \
  || (echo "❌ NPM Tarball Checksum failed!" && exit 1)
# Install NPM from verified tarball and global packages
RUN tar -xzf npm.tgz && \
  cd package && \
  node bin/npm-cli.js install -g npm@11.6.3 && \
  cd / && \
  rm -rf /tmp/npm-install && \
  npm install -g pnpm@10.23.0 @import-meta-env/cli && \
  # Fix CVE-2025-64756 by replacing vulnerable glob with patched version
  npm install -g glob@11.1.0 && \
  # Replace glob in npm's node_modules
  rm -rf /usr/lib/node_modules/npm/node_modules/glob && \
  cp -r /usr/lib/node_modules/glob /usr/lib/node_modules/npm/node_modules/ && \
  # Replace glob in @import-meta-env/cli's node_modules
  rm -rf /usr/lib/node_modules/@import-meta-env/cli/node_modules/glob && \
  cp -r /usr/lib/node_modules/glob /usr/lib/node_modules/@import-meta-env/cli/node_modules/



FROM node_base AS base_builder
# Required by @hoppscotch/js-sandbox to build `isolated-vm`
RUN apk add --no-cache python3 make g++ zlib-dev brotli-dev c-ares-dev nghttp2-dev openssl-dev icu-dev ada-dev simdjson-dev simdutf-dev sqlite-dev zstd-dev

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
HEALTHCHECK --interval=2s --start-period=15s CMD /bin/sh /healthcheck.sh

WORKDIR /dist/backend
CMD ["node", "/usr/src/app/aio_run.mjs"]

# NOTE: Although these ports are exposed, the HOPP_ALTERNATE_AIO_PORT variable can be used to assign a user-specified port
EXPOSE 3170
EXPOSE 3000
EXPOSE 3100
EXPOSE 3200
EXPOSE 80
