FROM nginx:stable-alpine
COPY public/ /usr/share/nginx/html
# 80 portu otomatik açılır
CMD ["nginx", "-g", "daemon off;"]
