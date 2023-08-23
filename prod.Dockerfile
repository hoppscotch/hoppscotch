FROM node:18-alpine3.16 as base_builder

WORKDIR /usr/src/app

ENV HOPP_ALLOW_RUNTIME_ENV=true

RUN npm install -g pnpm
COPY pnpm-lock.yaml .
RUN pnpm fetch

COPY . .
RUN pnpm install -f --offline


FROM base_builder as backend
WORKDIR /usr/src/app/packages/hoppscotch-backend
RUN pnpm exec prisma generate
RUN pnpm run build
ENV PRODUCTION="true"
ENV PORT=3170
ENV APP_PORT=${PORT}
ENV DB_URL=${DATABASE_URL}
CMD ["pnpm", "run", "start:prod"]
EXPOSE 3170

FROM base_builder as fe_builder
WORKDIR /usr/src/app/packages/hoppscotch-selfhost-web
RUN pnpm run generate

FROM caddy:2-alpine as app
WORKDIR /site
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-sh-admin/prod_run.mjs /usr
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/Caddyfile /etc/caddy/Caddyfile
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist/ .
RUN apk add nodejs npm
RUN npm install -g @import-meta-env/cli
EXPOSE 8080
CMD ["/bin/sh", "-c", "node /usr/prod_run.mjs && caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]

FROM base_builder as sh_admin_builder
WORKDIR /usr/src/app/packages/hoppscotch-sh-admin
RUN pnpm run build

FROM caddy:2-alpine as sh_admin
WORKDIR /site
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/prod_run.mjs /usr
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist/ .
RUN apk add nodejs npm
RUN npm install -g @import-meta-env/cli
EXPOSE 8080
CMD ["/bin/sh", "-c", "node /usr/prod_run.mjs && caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]

FROM backend as aio
RUN apk add caddy tini
RUN npm install -g @import-meta-env/cli
COPY --from=fe_builder /usr/src/app/packages/hoppscotch-selfhost-web/dist /site/selfhost-web
COPY --from=sh_admin_builder /usr/src/app/packages/hoppscotch-sh-admin/dist /site/sh-admin
COPY aio.Caddyfile /etc/caddy/Caddyfile
ENTRYPOINT [ "tini", "--" ]
RUN apk --no-cache add curl
COPY --chmod=755 healthcheck.sh .
HEALTHCHECK --interval=2s CMD /bin/sh ./healthcheck.sh
CMD ["node", "/usr/src/app/aio_run.mjs"]
EXPOSE 3170
EXPOSE 3000
EXPOSE 3100
