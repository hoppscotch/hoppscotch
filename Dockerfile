FROM node:12.10.0-alpine

LABEL maintainer="Hoppscotch (support@hoppscotch.io)"

# Add git as the prebuild target requires it to parse version information
RUN apk add --update --no-cache \
  git

# Create app directory
WORKDIR /app

COPY package*.json ./

RUN npm install

ADD . /app/

COPY . .

RUN npm run generate

ENV HOST 0.0.0.0
EXPOSE 3000

CMD ["npm", "run", "dev"]
