FROM node:lts

WORKDIR /usr/src/app

# # Install pnpm
RUN npm i -g pnpm

COPY pnpm-lock.yaml .
RUN pnpm fetch

# # PNPM package install
COPY ./packages/hoppscotch-backend .
RUN pnpm i --filter hoppscotch-backend

# Prisma bits
RUN pnpm exec prisma generate


EXPOSE 3170
EXPOSE 9229

ENV APP_PORT=${PORT}
ENV DB_URL=${DATABASE_URL}
ENV PRODUCTION=true

CMD ["pnpm", "run", "start"]
