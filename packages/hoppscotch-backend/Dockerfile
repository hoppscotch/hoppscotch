FROM node:lts

WORKDIR /usr/src/app

# # Install pnpm
RUN npm i -g pnpm

# # NPM package install
# COPY package*.json ./
# RUN pnpm install


# Prisma bits
COPY prisma ./
RUN pnpx prisma generate


COPY . .
RUN pnpm i

EXPOSE 3170
EXPOSE 9229

ENV APP_PORT=${PORT}
ENV DB_URL=${DATABASE_URL}
ENV PRODUCTION=true

#ENV FB_SERVICE_KEY_PATH="secrets/fb-service-key.json"
# CMD ["pnpm", "run", "start:dev"]
CMD ["pnpm", "run", "start"]
