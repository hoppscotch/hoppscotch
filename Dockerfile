FROM node:lts-alpine

LABEL maintainer="Hoppscotch (support@hoppscotch.io)"

# Add git as the prebuild target requires it to parse version information
RUN apk add --no-cache --virtual .gyp \
  python3 \
  make \
  g++

# Create app directory
WORKDIR /app

ADD . /app/

COPY . .

RUN npm install -g pnpm

RUN mv .env.example .env

RUN pnpm i --unsafe-perm=true

ENV HOST 0.0.0.0
EXPOSE 3000

RUN pnpm run generate

CMD ["pnpm", "run", "start"]
