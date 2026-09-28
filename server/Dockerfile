FROM node:20-bookworm

WORKDIR /app

# Библиотека Fanuc FOCAS — glibc, поэтому образ не Alpine.
# Файл не хранится в git: его забирает сборка из https://github.com/strangesast/fwlib
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL -o /usr/local/lib/libfwlib32.so.1.0.5 \
    https://github.com/strangesast/fwlib/raw/master/libfwlib32-linux-x64.so.1.0.5 \
  && [ "$(od -An -tx1 -N4 /usr/local/lib/libfwlib32.so.1.0.5 | tr -d ' \n')" = "7f454c46" ] \
  && ln -sf libfwlib32.so.1.0.5 /usr/local/lib/libfwlib32.so.1 \
  && ln -sf libfwlib32.so.1.0.5 /usr/local/lib/libfwlib32.so \
  && ldconfig \
  && rm -rf /var/lib/apt/lists/*

ENV FOCAS_LIBRARY=/usr/local/lib/libfwlib32.so

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server/ ./server/

RUN mkdir -p server/uploads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "server/index.js"]
