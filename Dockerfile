FROM node:18-alpine

# Cloud code için
WORKDIR /app
COPY cloud/ ./cloud/

# Nginx kur
RUN apk add --no-cache nginx
COPY public/ /usr/share/nginx/html

# Nginx config
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ =404; } }' > /etc/nginx/http.d/default.conf

EXPOSE 80

# Nginx ve cloud code'u başlat
CMD ["sh", "-c", "nginx -g 'daemon off;' & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]
