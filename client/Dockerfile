FROM node:20-alpine AS build-main

WORKDIR /app-main

COPY client/package.json client/package-lock.json* ./
RUN npm install

COPY client/ .
RUN npm run build


FROM node:20-alpine AS build-admin

WORKDIR /app-admin

COPY client-admin/package.json client-admin/package-lock.json* ./
RUN npm install

COPY client-admin/ .
RUN npm run build


FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY client/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build-main /app-main/dist /usr/share/nginx/html
COPY --from=build-admin /app-admin/dist /usr/share/nginx/html/admin

EXPOSE 80 8080

CMD ["nginx", "-g", "daemon off;"]
