# syntax=docker/dockerfile:1

FROM lsiobase/ubuntu:jammy

ARG HOPPSCOTH_RELEASE
ARG HOPPSCOTH_REPO="hoppscotch/hoppscotch"
LABEL build_version="Based on Linuxserver.io images version:- ${HOPPSCOTH_RELEASE}"
LABEL maintainer="Hoppscotch"

ARG DEBIAN_FRONTEND="noninteractive"

#deps - nvm, node, npm, pnpm
ENV NODE_VERSION=18.16.0
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
ENV NVM_DIR=/root/.nvm
RUN echo "**** install node family ****" && \
    apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash  && \
    . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && \
    nvm use v${NODE_VERSION} && nvm alias default v${NODE_VERSION} && \
    npm install -g npm pnpm && node --version && npm --version && pnpm --version

#deps - caddy
RUN echo "**** install caddy ****" && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    tee /etc/apt/sources.list.d/caddy-stable.list && \
    apt update && \
    apt install -y caddy && \
    caddy version

RUN echo "**** install hoppscoth ****" && \
  mkdir -p \
    /app/ && \
  if [ -z ${HOPPSCOTH_RELEASE+x} ]; then \
    HOPPSCOTH_RELEASE=$(curl -sX GET "https://api.github.com/repos/${HOPPSCOTH_REPO}/releases/latest" \
    | awk '/tag_name/{print $4;exit}' FS='[""]'); \
  fi && \
  mkdir -p /app && \
  echo $HOPPSCOTH_RELEASE && \
  curl -o \
    /tmp/hoppscotch.tar.gz -L \
    "https://github.com/${HOPPSCOTH_REPO}/archive/${HOPPSCOTH_RELEASE}.tar.gz" && \
  tar xf \
    /tmp/hoppscotch.tar.gz -C \
    /app/ --strip-components=1

WORKDIR /app
RUN echo "**** install app ****" && \
      cp .env.example .env && \
      pnpm install

RUN echo "**** cleanup ****" && \
  apt-get clean && \
  rm -rf \
    /tmp/* \
    /var/lib/apt/lists/* \
    /var/tmp/*

VOLUME /config
