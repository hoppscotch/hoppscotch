# Initial stage, just build the app
FROM node:lts as builder

WORKDIR /usr/src/app

RUN npm i -g pnpm

COPY . .
RUN pnpm install

WORKDIR /usr/src/app/packages/hoppscotch-sh-admin/
RUN pnpm run build


# Final stage, take the build artifacts and package it into a static Caddy server
FROM caddy:2-alpine
WORKDIR /site
COPY packages/hoppscotch-sh-admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /usr/src/app/packages/hoppscotch-sh-admin/dist/ .

EXPOSE 8080
