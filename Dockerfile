FROM node:18-alpine

# Sadece Nginx ve Cloud code için gerekli paketler
RUN apk add --no-cache nginx

# Cloud code
WORKDIR /app
COPY cloud/ ./cloud/

# Public dosyalar
COPY public/ /usr/share/nginx/html

# Nginx config
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ =404; } }' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]
