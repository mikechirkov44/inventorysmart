FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# dist монтируется с хоста через docker-compose volumes
RUN mkdir -p /usr/share/nginx/html/admin

EXPOSE 80 8080 443 8443

CMD ["nginx", "-g", "daemon off;"]
