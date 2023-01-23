FROM node:lts

WORKDIR /usr/src/app

# # Install pnpm
RUN npm i -g pnpm

# Prisma bits
COPY prisma ./prisma/
RUN pnpx prisma generate

# # PNPM package install
COPY . .
RUN pnpm i

EXPOSE 3170
EXPOSE 9229

ENV APP_PORT=${PORT}
ENV DB_URL=${DATABASE_URL}
ENV PRODUCTION=true

CMD ["pnpm", "run", "start"]
