FROM node:lts-alpine

LABEL maintainer="Hoppscotch (support@hoppscotch.io)"

# Add git as the prebuild target requires it to parse version information
RUN apk add --update --no-cache \
  git

# Create app directory
WORKDIR /app

ADD . /app/

COPY . .

RUN npm install -g pnpm

RUN pnpm i

ENV HOST 0.0.0.0
EXPOSE 3000

RUN mv packages/hoppscotch-app/.env.example packages/hoppscotch-app/.env

RUN pnpm run generate

CMD ["pnpm", "run", "start"]
