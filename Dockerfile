FROM nginx:stable-alpine

# Public dosyaları kopyala
COPY public/ /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
