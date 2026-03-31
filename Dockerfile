FROM node:18-alpine AS builder

# Cloud Code için çalışma dizini
WORKDIR /app
COPY cloud/ ./cloud/

FROM nginx:stable-alpine

# Public dosyaları kopyala
COPY public/ /usr/share/nginx/html

# Cloud Code için özel endpoint (Back4App otomatik tanır)
COPY --from=builder /app/cloud /usr/src/cloud

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
