FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server/ ./server/

RUN mkdir -p server/uploads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "server/index.js"]
