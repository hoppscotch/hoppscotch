FROM node:20.12.2 AS builder

WORKDIR /usr/src/app

# # Install pnpm
RUN npm i -g pnpm

COPY .env .
COPY pnpm-lock.yaml .
RUN pnpm fetch

ENV APP_PORT=${PORT}
ENV DB_URL=${DATABASE_URL}

# # PNPM package install
COPY ./packages/hoppscotch-backend .
RUN pnpm i --filter hoppscotch-backend

# Prisma bits
RUN pnpm exec prisma generate

FROM builder AS dev

ENV PRODUCTION="false"

CMD ["pnpm", "run", "start:dev"]

EXPOSE 3170


FROM builder AS prod

ENV PRODUCTION="true"

CMD ["pnpm", "run", "start:prod"]

EXPOSE 3170

