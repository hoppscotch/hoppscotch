FROM node:18 as base_builder

WORKDIR /usr/src/app

COPY . .
RUN npm install -g pnpm
RUN pnpm install --force

FROM base_builder as backend
WORKDIR /usr/src/app/packages/hoppscotch-backend
RUN pnpm exec prisma generate
RUN pnpm run build
CMD ["pnpm", "run", "start:prod"]
EXPOSE 3170

FROM base_builder as fe_builder
WORKDIR /usr/src/app/packages/hoppscotch-selfhost-web
RUN pnpm run generate

FROM caddy:2-alpine as frontend
WORKDIR /site
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/Caddyfile /etc/caddy/Caddyfile
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist/ .
EXPOSE 8080

FROM base_builder as sh_admin_builder
WORKDIR /usr/src/app/packages/hoppscotch-sh-admin
RUN pnpm run build

FROM caddy:2-alpine as sh_admin
WORKDIR /site
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist/ .
EXPOSE 8080
